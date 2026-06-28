import { describe, it, expect } from "vitest";
import { nextStatusForEvent, TASK_STATUS } from "./github.constants";

describe("nextStatusForEvent", () => {
  describe("push", () => {
    it("advances a fresh TODO to IN_PROGRESS", () => {
      expect(nextStatusForEvent(TASK_STATUS.TODO, "push")).toBe(
        TASK_STATUS.IN_PROGRESS,
      );
    });

    it("is a no-op once already IN_PROGRESS (idempotent multi-push)", () => {
      expect(nextStatusForEvent(TASK_STATUS.IN_PROGRESS, "push")).toBeNull();
    });

    it("does not touch BLOCKED/REVIEW tasks", () => {
      expect(nextStatusForEvent("BLOCKED", "push")).toBeNull();
      expect(nextStatusForEvent("REVIEW", "push")).toBeNull();
    });

    it("never reopens DONE or CANCELED", () => {
      expect(nextStatusForEvent(TASK_STATUS.DONE, "push")).toBeNull();
      expect(nextStatusForEvent(TASK_STATUS.CANCELED, "push")).toBeNull();
    });
  });

  describe("pr_merged", () => {
    it("completes any active task to DONE", () => {
      expect(nextStatusForEvent(TASK_STATUS.TODO, "pr_merged")).toBe(TASK_STATUS.DONE);
      expect(nextStatusForEvent(TASK_STATUS.IN_PROGRESS, "pr_merged")).toBe(
        TASK_STATUS.DONE,
      );
      expect(nextStatusForEvent("REVIEW", "pr_merged")).toBe(TASK_STATUS.DONE);
    });

    it("is idempotent on an already DONE task", () => {
      expect(nextStatusForEvent(TASK_STATUS.DONE, "pr_merged")).toBeNull();
    });

    it("never un-cancels a CANCELED task", () => {
      expect(nextStatusForEvent(TASK_STATUS.CANCELED, "pr_merged")).toBeNull();
    });
  });
});
