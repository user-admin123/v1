/**
 * Formats plain description text into structured JSX content:
 * - Lines starting with "- " or "• " become bullet points
 * - Empty lines become spacing
 * - Other lines stay as paragraphs
 */
export function formatDescription(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let bulletGroup: string[] = [];

  const flushBullets = () => {
    if (bulletGroup.length > 0) {
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="list-disc list-inside space-y-1 text-muted-foreground text-sm leading-relaxed"
        >
          {bulletGroup.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
      bulletGroup = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      bulletGroup.push(trimmed.replace(/^[-•]\s*/, ""));
    } else {
      flushBullets();
      if (trimmed === "") {
        elements.push(<div key={`sp-${idx}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-muted-foreground text-sm leading-relaxed">
            {trimmed}
          </p>
        );
      }
    }
  });
  flushBullets();

  return <div className="space-y-2">{elements}</div>;
}
