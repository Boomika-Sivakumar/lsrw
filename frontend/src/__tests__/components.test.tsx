import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge, Card } from "../components/ui";
import { Spinner } from "../components/ui/Spinner";

describe("UI components", () => {
  it("renders a Badge", () => {
    const html = renderToStaticMarkup(<Badge tone="green">Intermediate</Badge>);
    expect(html).toContain("Intermediate");
  });

  it("renders a Card with title and children", () => {
    const html = renderToStaticMarkup(<Card title="Scores"><span>Content</span></Card>);
    expect(html).toContain("Scores");
    expect(html).toContain("Content");
  });

  it("renders a Spinner label", () => {
    const html = renderToStaticMarkup(<Spinner label="Loading" />);
    expect(html).toContain("Loading");
  });
});