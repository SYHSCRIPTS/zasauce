"use client";

import { useMemo, useState } from "react";

type FsNode =
  | { kind: "dir"; name: string; children: FsNode[] }
  | { kind: "file"; name: string; content: string; mime: "text" | "json" | "md" };

type FsDir = Extract<FsNode, { kind: "dir" }>;
type FsFile = Extract<FsNode, { kind: "file" }>;

export function FileExplorerApp() {
  const fs = useMemo<FsDir>(() => {
    return {
    kind: "dir",
    name: "/",
    children: [
      {
        kind: "dir",
        name: "system",
        children: [
          {
            kind: "file",
            name: "config.sys",
            mime: "text",
            content: `# ZZAAKKKIIRRR OS
boot.mode=normal
ui.theme=liquid-glass
scanner.pose=mediapipe(optional)
`,
          },
          {
            kind: "file",
            name: "system_log.txt",
            mime: "text",
            content: `[${new Date().toISOString()}] boot: ok
[${new Date().toISOString()}] wm: window-manager online
[${new Date().toISOString()}] apps: registry loaded
`,
          },
        ],
      },
      { kind: "dir", name: "media", children: [] },
      {
        kind: "dir",
        name: "logs",
        children: [
          {
            kind: "file",
            name: "system_log.txt",
            mime: "text",
            content: `logs/system_log.txt\n\n(placeholder)\n`,
          },
        ],
      },
      {
        kind: "dir",
        name: "profile",
        children: [
          {
            kind: "file",
            name: "profile.json",
            mime: "json",
            content: JSON.stringify(
              {
                user: "ahmad",
                os: "ZZAAKKKIIRRR OS",
                theme: "liquid-glass",
                lastLogin: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      },
      { kind: "dir", name: "cache", children: [] },
      {
        kind: "dir",
        name: "projects",
        children: [
          {
            kind: "file",
            name: "notes.md",
            mime: "md",
            content: `# Notes\n\n- Double-click desktop icons to open apps.\n- Terminal commands: \`help\`, \`apps\`, \`open notes\`, \`whoami\`.\n`,
          },
        ],
      },
    ],
    };
  }, []);

  const [selectedPath, setSelectedPath] = useState<string>("/system");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  function joinPath(parent: string, name: string) {
    if (parent === "/") return `/${name}`;
    return `${parent}/${name}`;
  }

  function findNode(root: FsNode, path: string): FsNode | null {
    const parts = path.split("/").filter(Boolean);
    let cur: FsNode = root;
    for (const p of parts) {
      if (cur.kind !== "dir") return null;
      const next = cur.children.find((c) => c.name === p);
      if (!next) return null;
      cur = next;
    }
    return cur;
  }

  const dirNode = findNode(fs, selectedPath);
  const fileNode = selectedFilePath ? findNode(fs, selectedFilePath) : null;

  return (
    <div className="h-full w-full p-4 text-sm text-slate-800">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-slate-900">File Explorer</div>
        <div className="font-mono text-[11px] text-slate-500">
          {selectedFilePath ?? selectedPath}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-44px)]">
        {/* left tree */}
        <div className="col-span-4 os-glass os-liquid-edge rounded-2xl border border-slate-900/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-900/10 bg-white/55">
            <div className="text-xs font-semibold tracking-wide text-slate-700">
              FOLDERS
            </div>
          </div>
          <div className="p-2 overflow-auto h-[calc(100%-41px)]">
            <Tree
              node={fs}
              path="/"
              level={0}
              selectedPath={selectedPath}
              onSelectDir={(p) => {
                setSelectedPath(p);
                setSelectedFilePath(null);
              }}
            />
          </div>
        </div>

        {/* right viewer */}
        <div className="col-span-8 os-glass os-liquid-edge rounded-2xl border border-slate-900/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-900/10 bg-white/55 flex items-center justify-between">
            <div className="text-xs font-semibold tracking-wide text-slate-700">
              {selectedFilePath ? "FILE" : "CONTENTS"}
            </div>
            <div className="text-[11px] text-emerald-600">
              neon-glass
            </div>
          </div>

          <div className="grid grid-cols-12 h-[calc(100%-41px)]">
            <div className="col-span-4 border-r border-slate-900/10 p-2 overflow-auto">
              <div className="text-[11px] text-slate-500 px-2 pb-2">
                {selectedPath}
              </div>
              {dirNode?.kind === "dir" ? (
                <div className="flex flex-col gap-1">
                  {dirNode.children.map((c) => {
                    const p = joinPath(selectedPath, c.name);
                    const isFile = c.kind === "file";
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          if (isFile) setSelectedFilePath(p);
                          else {
                            setSelectedPath(p);
                            setSelectedFilePath(null);
                          }
                        }}
                        className={[
                          "text-left rounded-xl px-3 py-2 border",
                          "bg-white/55 hover:bg-white/75 border-slate-900/10",
                          selectedFilePath === p ? "ring-2 ring-emerald-200" : "",
                        ].join(" ")}
                      >
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                          <span className="font-mono text-emerald-600">
                            {isFile ? "FILE" : "DIR"}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </div>
                      </button>
                    );
                  })}
                  {dirNode.children.length === 0 && (
                    <div className="p-3 text-slate-500">Empty folder.</div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-slate-500">Select a folder.</div>
              )}
            </div>

            <div className="col-span-8 p-3 overflow-auto">
              {fileNode?.kind === "file" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">
                      {(fileNode as FsFile).name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {(fileNode as FsFile).mime}
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-2xl border border-emerald-400/20 bg-white/55 p-3 text-[12px] leading-5 font-mono text-slate-900 shadow-[0_18px_48px_rgba(16,185,129,0.08)]">
                    {(fileNode as FsFile).content}
                  </pre>
                </div>
              ) : (
                <div className="text-slate-500">
                  Select a file to view it.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tree({
  node,
  path,
  level,
  selectedPath,
  onSelectDir,
}: {
  node: FsDir;
  path: string;
  level: number;
  selectedPath: string;
  onSelectDir: (path: string) => void;
}) {
  const isRoot = path === "/";
  const dirs = node.children.filter((c): c is FsDir => c.kind === "dir");
  return (
    <div className="space-y-1">
      {isRoot && (
        <button
          type="button"
          onClick={() => onSelectDir("/")}
          className={[
            "w-full text-left rounded-xl px-3 py-2 border",
            "bg-white/55 hover:bg-white/75 border-slate-900/10",
            selectedPath === "/" ? "ring-2 ring-sky-200" : "",
          ].join(" ")}
        >
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
            <span className="font-mono text-sky-600">ROOT</span>
            /
          </div>
        </button>
      )}

      {dirs.map((d) => {
        const p = path === "/" ? `/${d.name}` : `${path}/${d.name}`;
        const isSelected = selectedPath === p;
        return (
          <div key={p}>
            <button
              type="button"
              onClick={() => onSelectDir(p)}
              className={[
                "w-full text-left rounded-xl px-3 py-2 border",
                "bg-white/55 hover:bg-white/75 border-slate-900/10",
                isSelected ? "ring-2 ring-sky-200" : "",
              ].join(" ")}
              style={{ marginLeft: level * 8 }}
            >
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <span className="font-mono text-emerald-600">DIR</span>
                <span className="truncate">{d.name}</span>
              </div>
            </button>

            <Tree
              node={d}
              path={p}
              level={level + 1}
              selectedPath={selectedPath}
              onSelectDir={onSelectDir}
            />
          </div>
        );
      })}
    </div>
  );
}

