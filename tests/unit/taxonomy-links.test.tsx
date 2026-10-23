// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TaxonomyLinks } from "@/components/navigation/taxonomy-links";

afterEach(cleanup);

describe("TaxonomyLinks", () => {
  it("分类使用名称本身，标签带 # 前缀", () => {
    const { rerender } = render(
      <TaxonomyLinks
        kind="categories"
        names={["开发记录"]}
        variant="category"
      />,
    );
    expect(screen.getByRole("link", { name: "开发记录" })).toBeInTheDocument();

    rerender(<TaxonomyLinks kind="tags" names={["博客"]} />);
    expect(screen.getByRole("link", { name: "#博客" })).toBeInTheDocument();
  });

  it("链接指向编码后的归档地址", () => {
    render(<TaxonomyLinks kind="tags" names={["Next.js"]} />);

    expect(screen.getByRole("link", { name: "#Next.js" })).toHaveAttribute(
      "href",
      `/tags/${encodeURIComponent("Next.js")}`,
    );
  });

  it("没有条目时不渲染任何内容", () => {
    const { container } = render(
      <TaxonomyLinks kind="categories" names={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
