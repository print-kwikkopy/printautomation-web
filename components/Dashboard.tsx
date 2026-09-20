"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

import type {
  Command,
  CommandEvent,
  CommandStatus,
} from "@/lib/types";


const FILTERS:
  Array<{
    label: string;
    value: "all" | CommandStatus;
  }> = [
    {
      label: "All",
      value: "all",
    },
    {
      label: "Queued",
      value: "queued",
    },
    {
      label: "Running",
      value: "running",
    },
    {
      label: "Done",
      value: "done",
    },
    {
      label: "Failed",
      value: "failed",
    },
  ];


function formatTime(
  value: string | null,
) {

  if (
    !value
  ) {
    return "—";
  }


  return new Intl.DateTimeFormat(
    "en-AU",
    {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    },
  ).format(
    new Date(
      value,
    ),
  );
}


function runtime(
  command: Command,
) {

  if (
    !command.started_at
  ) {
    return "—";
  }


  const end =
    command.completed_at
      ? new Date(
          command.completed_at,
        ).getTime()
      : Date.now();


  const seconds =
    Math.max(
      0,
      Math.round(
        (
          end -
          new Date(
            command.started_at,
          ).getTime()
        ) /
          1000,
      ),
    );


  if (
    seconds < 60
  ) {

    return `${seconds}s`;
  }


  return `${Math.floor(
    seconds / 60,
  )}m ${seconds % 60}s`;
}


export default function Dashboard(
  {
    userEmail,
  }: {
    userEmail: string;
  },
) {

  const supabase =
    useMemo(
      () =>
        createClient(),
      [],
    );


  const [
    commands,
    setCommands,
  ] =
    useState<
      Command[]
    >([]);


  const [
    events,
    setEvents,
  ] =
    useState<
      Record<
        string,
        CommandEvent[]
      >
    >({});


  const [
    expanded,
    setExpanded,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );


  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" |
      CommandStatus
    >(
      "all",
    );


  const [
    commandText,
    setCommandText,
  ] =
    useState(
      "",
    );


  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );


  const [
    notice,
    setNotice,
  ] =
    useState(
      "",
    );


  const [
    actioning,
    setActioning,
  ] =
    useState<
      string | null
    >(
      null,
    );


  const loadCommands =
    useCallback(
      async () => {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "commands",
            )
            .select(
              "*",
            )
            .order(
              "queue_number",
              {
                ascending:
                  false,
              },
            )
            .limit(
              100,
            );


        if (
          error
        ) {

          setNotice(
            error.message,
          );

          setLoading(
            false,
          );

          return;
        }


        setCommands(
          (
            data ??
            []
          ) as Command[],
        );


        setLoading(
          false,
        );
      },
      [
        supabase,
      ],
    );


  const loadEvents =
    useCallback(
      async (
        commandId:
          string,
      ) => {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "command_events",
            )
            .select(
              "*",
            )
            .eq(
              "command_id",
              commandId,
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              },
            );


        if (
          !error
        ) {

          setEvents(
            (
              current,
            ) => ({
              ...current,

              [commandId]:
                (
                  data ??
                  []
                ) as CommandEvent[],
            }),
          );
        }
      },
      [
        supabase,
      ],
    );


  useEffect(
    () => {

      void loadCommands();


      const channel =
        supabase
          .channel(
            "printautomation-dashboard",
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "commands",
            },
            () =>
              void loadCommands(),
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "command_events",
            },
            (
              payload,
            ) => {

              const commandId =
                (
                  payload.new as {
                    command_id?:
                      string;
                  } | null
                )
                  ?.command_id ??
                (
                  payload.old as {
                    command_id?:
                      string;
                  } | null
                )
                  ?.command_id;


              if (
                commandId
              ) {

                void loadEvents(
                  commandId,
                );
              }
            },
          )
          .subscribe();


      return () => {

        void supabase.removeChannel(
          channel,
        );
      };
    },
    [
      loadCommands,
      loadEvents,
      supabase,
    ],
  );


  async function submitCommand(
    event:
      FormEvent,
  ) {

    event.preventDefault();


    const raw =
      commandText.trim();


    if (
      !raw ||
      submitting
    ) {
      return;
    }


    setSubmitting(
      true,
    );

    setNotice(
      "",
    );


    const {
      error,
    } =
      await supabase
        .from(
          "commands",
        )
        .insert({
          raw_command:
            raw,
        });


    if (
      error
    ) {

      setNotice(
        error.message,
      );

    } else {

      setCommandText(
        "",
      );

      await loadCommands();
    }


    setSubmitting(
      false,
    );
  }


  async function cancelCommand(
    command:
      Command,
  ) {

    if (
      actioning
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        command.status ===
          "running"
          ? `Cancel #${String(
              command.queue_number,
            ).padStart(
              3,
              "0",
            )}?\n\nThe dashboard will mark it cancelled, but an automation already running on the Windows PC may continue until its current workflow finishes.`
          : `Cancel #${String(
              command.queue_number,
            ).padStart(
              3,
              "0",
            )}?\n\nThis command will not be processed by the worker.`,
      );


    if (
      !confirmed
    ) {
      return;
    }


    setActioning(
      command.id,
    );

    setNotice(
      "",
    );


    const {
      error,
    } =
      await supabase.rpc(
        "cancel_command",
        {
          target_command_id:
            command.id,
        },
      );


    if (
      error
    ) {

      setNotice(
        error.message,
      );

    } else {

      await loadCommands();
    }


    setActioning(
      null,
    );
  }


  async function deleteCommand(
    command:
      Command,
  ) {

    if (
      actioning
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Delete #${String(
          command.queue_number,
        ).padStart(
          3,
          "0",
        )} permanently?\n\n${command.raw_command}\n\nIts execution log will also be deleted.`,
      );


    if (
      !confirmed
    ) {
      return;
    }


    setActioning(
      command.id,
    );

    setNotice(
      "",
    );


    const {
      error,
    } =
      await supabase.rpc(
        "delete_command",
        {
          target_command_id:
            command.id,
        },
      );


    if (
      error
    ) {

      setNotice(
        error.message,
      );

    } else {

      setExpanded(
        (
          current,
        ) => {

          const next =
            new Set(
              current,
            );

          next.delete(
            command.id,
          );

          return next;
        },
      );


      setEvents(
        (
          current,
        ) => {

          const next = {
            ...current,
          };

          delete next[
            command.id
          ];

          return next;
        },
      );


      await loadCommands();
    }


    setActioning(
      null,
    );
  }


  function toggleExpanded(
    commandId:
      string,
  ) {

    setExpanded(
      (
        current,
      ) => {

        const next =
          new Set(
            current,
          );


        if (
          next.has(
            commandId,
          )
        ) {

          next.delete(
            commandId,
          );

        } else {

          next.add(
            commandId,
          );

          void loadEvents(
            commandId,
          );
        }


        return next;
      },
    );
  }


  async function signOut() {

    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }


  const visibleCommands =
    filter ===
    "all"
      ? commands
      : commands.filter(
          (
            command,
          ) =>
            command.status ===
            filter,
        );


  const runningCount =
    commands.filter(
      (
        command,
      ) =>
        command.status ===
        "running",
    ).length;


  const queuedCount =
    commands.filter(
      (
        command,
      ) =>
        command.status ===
        "queued",
    ).length;


  return (
    <main className="app-shell">

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark small">
            PA
          </div>

          <div>
            <p className="eyebrow">
              KWIK KOPY NORTH SYDNEY
            </p>

            <h1>
              PrintAutomation
            </h1>
          </div>

        </div>


        <div className="topbar-right">

          <div className="worker-summary">

            <span
              className={`status-dot ${
                runningCount
                  ? "running"
                  : "idle"
              }`}
            />

            <span>
              {
                runningCount
                  ? `${runningCount} command running`
                  : queuedCount
                    ? `${queuedCount} queued`
                    : "Queue ready"
              }
            </span>

          </div>


          <button
            className="ghost-button"
            onClick={
              signOut
            }
          >
            Sign out
          </button>

        </div>

      </header>


      <section className="content">

        <div className="hero-grid">

          <section className="command-card">

            <p className="eyebrow">
              NEW COMMAND
            </p>

            <h2>
              What should the worker do?
            </h2>


            <form
              className="command-form"
              onSubmit={
                submitCommand
              }
            >

              <input
                value={
                  commandText
                }
                onChange={
                  (
                    event,
                  ) =>
                    setCommandText(
                      event.target.value,
                    )
                }
                placeholder="e.g. 69227 print"
                autoFocus
              />

              <button
                className="primary-button"
                disabled={
                  submitting
                }
              >
                {
                  submitting
                    ? "Adding..."
                    : "Add to Queue"
                }
              </button>

            </form>


            <div className="examples">

              <span>
                Examples
              </span>

              {[
                "69227 print",
                "50869 send invoice",
                "daily pickup",
              ].map(
                (
                  example,
                ) => (

                  <button
                    key={
                      example
                    }
                    type="button"
                    onClick={
                      () =>
                        setCommandText(
                          example,
                        )
                    }
                  >
                    {example}
                  </button>
                ),
              )}

            </div>

          </section>


          <section className="stats-card">

            <div>
              <span>
                Queued
              </span>

              <strong>
                {queuedCount}
              </strong>
            </div>


            <div>
              <span>
                Running
              </span>

              <strong>
                {runningCount}
              </strong>
            </div>


            <div>
              <span>
                Completed
              </span>

              <strong>
                {
                  commands.filter(
                    (
                      command,
                    ) =>
                      command.status ===
                      "done",
                  ).length
                }
              </strong>
            </div>

          </section>

        </div>


        {
          notice &&
          (
            <div className="notice">
              {notice}
            </div>
          )
        }


        <section className="queue-section">

          <div className="queue-heading">

            <div>
              <p className="eyebrow">
                LIVE QUEUE
              </p>

              <h2>
                Commands
              </h2>
            </div>


            <div className="filter-tabs">

              {
                FILTERS.map(
                  (
                    item,
                  ) => (

                    <button
                      key={
                        item.value
                      }
                      className={
                        filter ===
                        item.value
                          ? "active"
                          : ""
                      }
                      onClick={
                        () =>
                          setFilter(
                            item.value,
                          )
                      }
                    >
                      {item.label}
                    </button>
                  ),
                )
              }

            </div>

          </div>


          <div className="queue-list">

            {
              loading
                ? (
                    <div className="empty-state">
                      Loading queue…
                    </div>
                  )
                : visibleCommands.length ===
                    0
                  ? (
                      <div className="empty-state">
                        No commands here yet. Add your first command above.
                      </div>
                    )
                  : visibleCommands.map(
                      (
                        command,
                      ) => {

                        const isOpen =
                          expanded.has(
                            command.id,
                          );


                        const commandEvents =
                          events[
                            command.id
                          ] ??
                          [];


                        const canCancel =
                          command.status ===
                            "queued" ||
                          command.status ===
                            "running";


                        const canDelete =
                          command.status ===
                            "done" ||
                          command.status ===
                            "failed" ||
                          command.status ===
                            "cancelled";


                        const isActioning =
                          actioning ===
                          command.id;


                        return (
                          <article
                            className={`queue-item status-${command.status}`}
                            key={
                              command.id
                            }
                          >

                            <div className="queue-row">

                              <button
                                type="button"
                                className="queue-row-main"
                                onClick={
                                  () =>
                                    toggleExpanded(
                                      command.id,
                                    )
                                }
                              >

                                <div className="queue-number">
                                  #
                                  {
                                    String(
                                      command.queue_number,
                                    ).padStart(
                                      3,
                                      "0",
                                    )
                                  }
                                </div>


                                <div className="queue-command">

                                  <strong>
                                    {
                                      command.raw_command.toUpperCase()
                                    }
                                  </strong>

                                  <span>
                                    {
                                      command.current_step ??
                                      "Waiting in queue"
                                    }
                                  </span>

                                </div>


                                <div className="progress-cell">

                                  <div className="progress-track">

                                    <div
                                      className="progress-fill"
                                      style={{
                                        width:
                                          `${command.progress}%`,
                                      }}
                                    />

                                  </div>

                                  <span>
                                    {command.progress}%
                                  </span>

                                </div>


                                <span
                                  className={`status-pill ${command.status}`}
                                >
                                  {command.status}
                                </span>


                                <span
                                  className={`chevron ${
                                    isOpen
                                      ? "open"
                                      : ""
                                  }`}
                                >
                                  ⌄
                                </span>

                              </button>


                              {
                                canCancel &&
                                (
                                  <button
                                    type="button"
                                    className="command-action cancel-action"
                                    disabled={
                                      isActioning
                                    }
                                    onClick={
                                      () =>
                                        void cancelCommand(
                                          command,
                                        )
                                    }
                                  >
                                    {
                                      isActioning
                                        ? "..."
                                        : "Cancel"
                                    }
                                  </button>
                                )
                              }


                              {
                                canDelete &&
                                (
                                  <button
                                    type="button"
                                    className="command-action delete-action"
                                    disabled={
                                      isActioning
                                    }
                                    onClick={
                                      () =>
                                        void deleteCommand(
                                          command,
                                        )
                                    }
                                  >
                                    {
                                      isActioning
                                        ? "..."
                                        : "Delete"
                                    }
                                  </button>
                                )
                              }

                            </div>


                            {
                              isOpen &&
                              (
                                <div className="command-detail">

                                  <div className="detail-grid">

                                    <div>
                                      <span>
                                        Created
                                      </span>

                                      <strong>
                                        {
                                          formatTime(
                                            command.created_at,
                                          )
                                        }
                                      </strong>
                                    </div>


                                    <div>
                                      <span>
                                        Started
                                      </span>

                                      <strong>
                                        {
                                          formatTime(
                                            command.started_at,
                                          )
                                        }
                                      </strong>
                                    </div>


                                    <div>
                                      <span>
                                        Runtime
                                      </span>

                                      <strong>
                                        {
                                          runtime(
                                            command,
                                          )
                                        }
                                      </strong>
                                    </div>


                                    <div>
                                      <span>
                                        Worker
                                      </span>

                                      <strong>
                                        {
                                          command.claimed_by ??
                                          "—"
                                        }
                                      </strong>
                                    </div>

                                  </div>


                                  {
                                    command.error_message &&
                                    (
                                      <div className="error-box">
                                        {
                                          command.error_message
                                        }
                                      </div>
                                    )
                                  }


                                  <div className="event-log">

                                    <div className="event-log-heading">

                                      <strong>
                                        Execution log
                                      </strong>

                                      <span>
                                        {
                                          commandEvents.length
                                        } events
                                      </span>

                                    </div>


                                    {
                                      commandEvents.length ===
                                      0
                                        ? (
                                            <div className="event-empty">
                                              No worker events recorded yet.
                                            </div>
                                          )
                                        : commandEvents.map(
                                            (
                                              item,
                                            ) => (

                                              <div
                                                className={`event-row ${item.level}`}
                                                key={
                                                  item.id
                                                }
                                              >

                                                <time>
                                                  {
                                                    formatTime(
                                                      item.created_at,
                                                    )
                                                  }
                                                </time>

                                                <span>
                                                  {item.message}
                                                </span>

                                                <b>
                                                  {
                                                    item.progress ===
                                                    null
                                                      ? ""
                                                      : `${item.progress}%`
                                                  }
                                                </b>

                                              </div>
                                            ),
                                          )
                                    }

                                  </div>

                                </div>
                              )
                            }

                          </article>
                        );
                      },
                    )
            }

          </div>

        </section>


        <footer>

          <span>
            Signed in as {userEmail}
          </span>

          <span>
            Supabase Realtime connected automatically
          </span>

        </footer>

      </section>

    </main>
  );
}