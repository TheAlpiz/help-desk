import React, { useMemo } from "react";
import { format, differenceInDays, addDays, min, max, startOfWeek } from "date-fns";

export function TaskGantt({ tasks }: { tasks: any[] }) {
  const { minDate, maxDate, dayCount } = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { minDate: new Date(), maxDate: addDays(new Date(), 30), dayCount: 30 };
    }

    const dates = tasks.flatMap((t) => {
      const created = new Date(t.createdAt);
      const due = t.dueDate ? new Date(t.dueDate) : addDays(created, 7);
      return [created, due];
    });

    // Start a bit before the earliest task
    const earliest = startOfWeek(min(dates), { weekStartsOn: 1 });
    // End a bit after the latest task
    const latest = addDays(max(dates), 7);

    return {
      minDate: earliest,
      maxDate: latest,
      dayCount: differenceInDays(latest, earliest) + 1,
    };
  }, [tasks]);

  const days = Array.from({ length: dayCount }).map((_, i) => addDays(minDate, i));

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-x-auto flex flex-col h-[calc(100vh-140px)] min-h-[600px] pretty-scroll">
      {/* Header timeline */}
      <div className="flex border-b border-outline-variant shrink-0 bg-surface-container-low min-w-max sticky top-0 z-10">
        <div className="w-64 shrink-0 border-r border-outline-variant px-4 py-3 sticky left-0 z-20 bg-surface-container-low">
          <span className="text-sm font-semibold text-on-surface">Task</span>
        </div>
        <div className="flex flex-1">
          {days.map((day, i) => (
            <div
              key={i}
              className={`w-12 shrink-0 border-r border-outline-variant/30 flex flex-col items-center justify-center py-2 ${
                day.getDay() === 0 || day.getDay() === 6 ? "bg-surface-container-highest/20" : ""
              }`}
            >
              <span className="text-[10px] text-on-surface-variant uppercase font-medium">
                {format(day, "eee")}
              </span>
              <span className="text-xs font-semibold text-on-surface">
                {format(day, "d")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt rows */}
      <div className="flex flex-col min-w-max flex-1 bg-surface">
        {tasks.map((task) => {
          const created = new Date(task.createdAt);
          const due = task.dueDate ? new Date(task.dueDate) : addDays(created, 7);

          const startOffset = Math.max(0, differenceInDays(created, minDate));
          const duration = Math.max(1, differenceInDays(due, created));
          
          const isDone = task.status === "DONE" || task.status === "CANCELED";

          return (
            <div key={task.id} className="flex border-b border-outline-variant/50 hover:bg-white/5 transition-colors group">
              <div className="w-64 shrink-0 border-r border-outline-variant px-4 py-3 flex items-center sticky left-0 z-20 bg-surface group-hover:bg-surface-container-lowest transition-colors">
                <span className="text-sm text-on-surface truncate font-medium" title={task.title}>
                  {task.title}
                </span>
              </div>
              <div className="flex flex-1 relative items-center">
                {/* Background grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={`w-12 shrink-0 border-r border-outline-variant/10 ${
                        day.getDay() === 0 || day.getDay() === 6 ? "bg-surface-container-highest/10" : ""
                      }`}
                    />
                  ))}
                </div>
                
                {/* Task Bar */}
                <div
                  className={`absolute h-6 rounded-md shadow-sm flex items-center px-2 z-10 truncate text-[10px] font-semibold transition-all ${
                    isDone 
                      ? "bg-surface-container-highest text-on-surface-variant line-through opacity-70"
                      : "bg-primary text-on-primary"
                  }`}
                  style={{
                    left: `${startOffset * 3}rem`, // 3rem = w-12 = 48px
                    width: `${duration * 3}rem`,
                  }}
                  title={`${format(created, "MMM d")} - ${format(due, "MMM d")}`}
                >
                  <span className="truncate">{task.title}</span>
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="p-8 text-center text-sm text-on-surface-variant/40">
            No tasks to display in timeline.
          </div>
        )}
      </div>
    </div>
  );
}
