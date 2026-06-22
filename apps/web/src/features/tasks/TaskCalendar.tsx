import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TaskCalendar({ tasks }: { tasks: any[] }) {
  const { t } = useTranslation("common");
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;

      // Find tasks due on this day
      const dayTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return isSameDay(taskDate, cloneDay);
      });

      days.push(
        <div
          key={day.toISOString()}
          className={`min-h-[120px] p-2 border-r border-b border-outline-variant ${
            !isSameMonth(day, monthStart)
              ? "bg-surface-container-lowest text-on-surface-variant/40"
              : "bg-surface-container-low text-on-surface"
          } ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}
        >
          <div className="flex justify-end">
            <span
              className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                isSameDay(day, new Date())
                  ? "bg-primary text-on-primary"
                  : ""
              }`}
            >
              {formattedDate}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {dayTasks.map((task) => {
              const isDone = task.status === "DONE" || task.status === "CANCELED";
              return (
                <div
                  key={task.id}
                  className={`px-1.5 py-1 text-[10px] rounded border font-medium truncate ${
                    isDone
                      ? "bg-surface-container-highest text-on-surface-variant border-outline-variant line-through opacity-70"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}
                  title={task.title}
                >
                  {task.title}
                </div>
              );
            })}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toISOString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
      <div className="h-14 px-4 flex items-center justify-between border-b border-outline-variant shrink-0 bg-surface-container-low">
        <h2 className="text-sm font-semibold text-on-surface">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-on-surface-variant transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 h-8 text-xs font-semibold rounded-lg hover:bg-white/5 text-on-surface-variant transition-colors border border-outline-variant"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-on-surface-variant transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-lowest shrink-0">
        {weekDays.map((wd) => (
          <div
            key={wd}
            className="py-2 text-center text-xs font-semibold text-on-surface-variant uppercase tracking-wider border-r border-outline-variant last:border-r-0"
          >
            {wd}
          </div>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto pretty-scroll">
        <div className="flex flex-col min-h-full">
          {rows}
        </div>
      </div>
    </div>
  );
}
