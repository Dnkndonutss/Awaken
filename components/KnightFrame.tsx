import type { ReactNode } from "react";

export type KnightFrameVariant =
  | "large-horizontal"
  | "medium-vertical"
  | "standard-card"
  | "square-card"
  | "compact-box"
  | "modal-dialog";

type KnightFrameProps = Readonly<{
  as?: "div" | "section" | "aside";
  children: ReactNode;
  className?: string;
  variant?: KnightFrameVariant;
}>;

/**
 * A scalable, code-native frame. The rail is the CSS equivalent of a 9-slice:
 * fixed corner plates and accents surround independently stretching edge runs.
 */
export function KnightFrame({
  as: Tag = "div",
  children,
  className = "",
  variant = "standard-card"
}: KnightFrameProps) {
  return (
    <Tag className={`knight-frame knight-frame--${variant} ${className}`.trim()}>
      <span className="knight-frame__rail" aria-hidden="true" />
      <span className="knight-frame__corner knight-frame__corner--tl" aria-hidden="true" />
      <span className="knight-frame__corner knight-frame__corner--tr" aria-hidden="true" />
      <span className="knight-frame__corner knight-frame__corner--bl" aria-hidden="true" />
      <span className="knight-frame__corner knight-frame__corner--br" aria-hidden="true" />
      <span className="knight-frame__gem knight-frame__gem--top" aria-hidden="true" />
      <span className="knight-frame__gem knight-frame__gem--right" aria-hidden="true" />
      <span className="knight-frame__gem knight-frame__gem--bottom" aria-hidden="true" />
      <span className="knight-frame__gem knight-frame__gem--left" aria-hidden="true" />
      {children}
    </Tag>
  );
}
