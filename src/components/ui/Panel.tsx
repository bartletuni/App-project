import { ReactNode, ElementType } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Render the small L-shaped corner ticks. */
  ticks?: boolean;
  as?: ElementType;
}

function Tick({ position }: { position: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-2.5 w-2.5 border-clay-500/50 ${position}`}
    />
  );
}

/**
 * A "spec-sheet" panel: warm dark surface, hairline warm border, and
 * optional engraved corner tick marks. The structural building block of
 * the foundry UI.
 */
export default function Panel({
  children,
  className = "",
  ticks = true,
  as: Tag = "div",
}: PanelProps) {
  return (
    <Tag className={`panel ${className}`}>
      {ticks && (
        <>
          <Tick position="left-1.5 top-1.5 border-l border-t" />
          <Tick position="right-1.5 top-1.5 border-r border-t" />
          <Tick position="left-1.5 bottom-1.5 border-l border-b" />
          <Tick position="right-1.5 bottom-1.5 border-r border-b" />
        </>
      )}
      {children}
    </Tag>
  );
}
