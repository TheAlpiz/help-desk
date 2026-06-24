import { and, eq, desc, inArray, isNull, count, ne, lt, gt } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { conversation, conversationParticipant, chatMessage } from "./messaging.schema";
import { user } from "../user/user.schema";
import { attachment } from "../attachment/attachment.schema";

// Only these roles may open a group conversation.
const GROUP_CREATOR_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"];

export const MessagingService = {
  async createGroup(
    creatorId: string,
    organizationId: string,
    creatorRole: string,
    name: string,
    participantIds: string[],
  ) {
    if (!GROUP_CREATOR_ROLES.includes(creatorRole)) {
      throw new Error("Only admins or supervisors can create groups");
    }
    return withTenantTransaction(organizationId, async (tx) => {
      const ids = Array.from(new Set(participantIds.filter((id) => id !== creatorId)));
      if (ids.length > 0) {
        const valid = await tx
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.organizationId, organizationId), inArray(user.id, ids)));
        if (valid.length !== ids.length) {
          throw new Error("Some participants are not in this organization");
        }
      }

      const [conv] = await tx
        .insert(conversation)
        .values({ organizationId, type: "group", name })
        .returning({ id: conversation.id });

      // Creator is always a member.
      await tx
        .insert(conversationParticipant)
        .values([creatorId, ...ids].map((uid) => ({ conversationId: conv.id, userId: uid })));

      return conv.id;
    });
  },
  async getOrCreateDirect(currentUserId: string, targetUserId: string, organizationId: string) {
    if (currentUserId === targetUserId) throw new Error("Cannot message yourself");

    return withTenantTransaction(organizationId, async (tx) => {
      // Validate target user is in the same org
      const targetUser = await tx
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.id, targetUserId), eq(user.organizationId, organizationId)))
        .limit(1);
      if (targetUser.length === 0) throw new Error("User not found in this organization");

      // Find existing direct conversation between the two users
      const myConvs = await tx
        .select({ conversationId: conversationParticipant.conversationId })
        .from(conversationParticipant)
        .innerJoin(conversation, eq(conversation.id, conversationParticipant.conversationId))
        .where(
          and(
            eq(conversationParticipant.userId, currentUserId),
            eq(conversation.organizationId, organizationId),
            eq(conversation.type, "direct"),
          ),
        );

      if (myConvs.length > 0) {
        const convIds = myConvs.map((r) => r.conversationId);
        const existing = await tx
          .select({ conversationId: conversationParticipant.conversationId })
          .from(conversationParticipant)
          .where(
            and(
              eq(conversationParticipant.userId, targetUserId),
              inArray(conversationParticipant.conversationId, convIds),
            ),
          )
          .limit(1);
        if (existing.length > 0) return existing[0].conversationId;
      }

      const [newConv] = await tx
        .insert(conversation)
        .values({ organizationId, type: "direct" })
        .returning({ id: conversation.id });

      await tx.insert(conversationParticipant).values([
        { conversationId: newConv.id, userId: currentUserId },
        { conversationId: newConv.id, userId: targetUserId },
      ]);

      return newConv.id;
    });
  },

  async listConversations(userId: string, organizationId: string) {
    return withTenantTransaction(organizationId, async (tx) => {
      const convRows = await tx
        .select({
          id: conversation.id,
          type: conversation.type,
          name: conversation.name,
          updatedAt: conversation.updatedAt,
        })
        .from(conversation)
        .innerJoin(
          conversationParticipant,
          and(
            eq(conversationParticipant.conversationId, conversation.id),
            eq(conversationParticipant.userId, userId),
          ),
        )
        .where(eq(conversation.organizationId, organizationId))
        .orderBy(desc(conversation.updatedAt));

      if (convRows.length === 0) return [];

      const convIds = convRows.map((r) => r.id);

      // All participants in one query
      const participantRows = await tx
        .select({
          conversationId: conversationParticipant.conversationId,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          lastReadAt: conversationParticipant.lastReadAt,
        })
        .from(conversationParticipant)
        .innerJoin(user, eq(user.id, conversationParticipant.userId))
        .where(inArray(conversationParticipant.conversationId, convIds));

      // Last message per conversation (most recent message, dedup in JS)
      const allRecentMsgs = await tx
        .select({
          id: chatMessage.id,
          conversationId: chatMessage.conversationId,
          body: chatMessage.body,
          senderId: chatMessage.senderId,
          createdAt: chatMessage.createdAt,
        })
        .from(chatMessage)
        .where(and(inArray(chatMessage.conversationId, convIds), isNull(chatMessage.deletedAt)))
        .orderBy(desc(chatMessage.createdAt));

      const lastMsgByConv: Record<string, (typeof allRecentMsgs)[number]> = {};
      for (const msg of allRecentMsgs) {
        if (!lastMsgByConv[msg.conversationId]) lastMsgByConv[msg.conversationId] = msg;
      }

      // Unread counts per conversation
      const myParticipantMap: Record<string, Date> = {};
      for (const p of participantRows) {
        if (p.userId === userId) myParticipantMap[p.conversationId] = p.lastReadAt;
      }

      const unreadByConv: Record<string, number> = {};
      for (const convId of convIds) {
        const lastRead = myParticipantMap[convId];
        if (!lastRead) { unreadByConv[convId] = 0; continue; }
        const [{ count: unread }] = await tx
          .select({ count: count() })
          .from(chatMessage)
          .where(
            and(
              eq(chatMessage.conversationId, convId),
              isNull(chatMessage.deletedAt),
              ne(chatMessage.senderId, userId),
              gt(chatMessage.createdAt, lastRead),
            ),
          );
        unreadByConv[convId] = Number(unread);
      }

      // Group participants
      const participantsByConv: Record<string, (typeof participantRows)> = {};
      for (const p of participantRows) {
        if (!participantsByConv[p.conversationId]) participantsByConv[p.conversationId] = [];
        participantsByConv[p.conversationId].push(p);
      }

      return convRows.map((conv) => ({
        id: conv.id,
        type: conv.type,
        name: conv.name,
        participants: participantsByConv[conv.id] || [],
        lastMessage: lastMsgByConv[conv.id] || null,
        unreadCount: unreadByConv[conv.id] || 0,
        updatedAt: conv.updatedAt,
      }));
    });
  },

  async listMessages(
    conversationId: string,
    userId: string,
    organizationId: string,
    cursor?: string,
    limit = 50,
  ) {
    return withTenantTransaction(organizationId, async (tx) => {
      const participant = await tx
        .select({ userId: conversationParticipant.userId })
        .from(conversationParticipant)
        .innerJoin(conversation, eq(conversation.id, conversationParticipant.conversationId))
        .where(
          and(
            eq(conversationParticipant.conversationId, conversationId),
            eq(conversationParticipant.userId, userId),
            eq(conversation.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (participant.length === 0) throw new Error("Not a participant");

      const cursorCond = cursor ? lt(chatMessage.createdAt, new Date(cursor)) : undefined;

      const rows = await tx
        .select({
          id: chatMessage.id,
          conversationId: chatMessage.conversationId,
          senderId: chatMessage.senderId,
          body: chatMessage.body,
          attachmentCount: chatMessage.attachmentCount,
          createdAt: chatMessage.createdAt,
          senderFirstName: user.firstName,
          senderLastName: user.lastName,
          senderEmail: user.email,
        })
        .from(chatMessage)
        .innerJoin(user, eq(user.id, chatMessage.senderId))
        .where(and(eq(chatMessage.conversationId, conversationId), isNull(chatMessage.deletedAt), cursorCond))
        .orderBy(desc(chatMessage.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      // Attachments for this page, keyed by message id (entityType CHAT_MESSAGE).
      const msgIds = items.map((m) => m.id);
      const attByMsg: Record<string, { id: string; filename: string; mimeType: string; sizeBytes: number }[]> = {};
      if (msgIds.length > 0) {
        const atts = await tx
          .select({
            id: attachment.id,
            entityId: attachment.entityId,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
          })
          .from(attachment)
          .where(
            and(
              eq(attachment.organizationId, organizationId),
              eq(attachment.entityType, "CHAT_MESSAGE"),
              inArray(attachment.entityId, msgIds),
            ),
          );
        for (const a of atts) {
          (attByMsg[a.entityId] ??= []).push({
            id: a.id,
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          });
        }
      }

      return {
        messages: items.reverse().map((m) => ({ ...m, attachments: attByMsg[m.id] ?? [] })),
        hasMore,
        nextCursor: hasMore && items[0] ? items[0].createdAt.toISOString() : null,
      };
    });
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    organizationId: string,
    attachmentCount = 0,
  ) {
    return withTenantTransaction(organizationId, async (tx) => {
      const participant = await tx
        .select({ userId: conversationParticipant.userId })
        .from(conversationParticipant)
        .innerJoin(conversation, eq(conversation.id, conversationParticipant.conversationId))
        .where(
          and(
            eq(conversationParticipant.conversationId, conversationId),
            eq(conversationParticipant.userId, senderId),
            eq(conversation.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (participant.length === 0) throw new Error("Not a participant");

      const [msg] = await tx
        .insert(chatMessage)
        .values({ conversationId, senderId, body, attachmentCount })
        .returning();

      // Bump conversation updatedAt so it rises to top of list
      await tx.update(conversation).set({ updatedAt: new Date() }).where(eq(conversation.id, conversationId));

      // Mark sender as read immediately
      await tx
        .update(conversationParticipant)
        .set({ lastReadAt: new Date() })
        .where(and(eq(conversationParticipant.conversationId, conversationId), eq(conversationParticipant.userId, senderId)));

      const allParticipants = await tx
        .select({ userId: conversationParticipant.userId })
        .from(conversationParticipant)
        .where(eq(conversationParticipant.conversationId, conversationId));

      const recipientIds = allParticipants.map((p) => p.userId).filter((uid) => uid !== senderId);

      return { msg, recipientIds };
    });
  },

  // After a sender's attachments finish uploading, we re-emit chat.message so
  // recipients refetch and swap their skeletons for the real files. Validates the
  // caller is the message's sender + a participant, and returns who to notify.
  async getMessageRecipients(
    conversationId: string,
    messageId: string,
    senderId: string,
    organizationId: string,
  ): Promise<string[]> {
    return withTenantTransaction(organizationId, async (tx) => {
      const [msg] = await tx
        .select({ id: chatMessage.id })
        .from(chatMessage)
        .innerJoin(conversation, eq(conversation.id, chatMessage.conversationId))
        .where(
          and(
            eq(chatMessage.id, messageId),
            eq(chatMessage.conversationId, conversationId),
            eq(chatMessage.senderId, senderId),
            eq(conversation.organizationId, organizationId),
          ),
        )
        .limit(1);
      if (!msg) throw new Error("Message not found");

      const parts = await tx
        .select({ userId: conversationParticipant.userId })
        .from(conversationParticipant)
        .where(eq(conversationParticipant.conversationId, conversationId));
      return parts.map((p) => p.userId).filter((uid) => uid !== senderId);
    });
  },

  async markRead(conversationId: string, userId: string, organizationId: string) {
    return withTenantTransaction(organizationId, async (tx) => {
      await tx
        .update(conversationParticipant)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipant.conversationId, conversationId),
            eq(conversationParticipant.userId, userId),
          ),
        );
    });
  },
};
