import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ModelDataTable from "@/components/ModelDataTable";
import { Response } from "@/types/http";
import { DataTableColumn, IModel, ItemsResponse } from "@/types/model";

interface TestRow extends IModel {
  name: string;
}

const row: TestRow = { id: 1, name: "Alpha", created_at: "", updated_at: "" };

function makeModel(rows: TestRow[] = [row]) {
  const response: Response<ItemsResponse<TestRow>> = {
    success: true,
    message: "ok",
    data: { items: rows, itemsCount: rows.length, pagesCount: 1, page: 1 },
    errors: {},
    status: 200,
  };

  const columns: DataTableColumn<TestRow>[] = [
    { field: "id", headerName: "ID" },
    { field: "name", headerName: "Name" },
  ];

  return {
    all: vi.fn().mockResolvedValue(response),
    getDataTableColumns: () => columns,
  };
}

describe("ModelDataTable search debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fetch while typing fast, and fetches exactly once 800ms after the last keystroke", async () => {
    const model = makeModel();
    render(<ModelDataTable model={model} />);

    // initial load
    expect(model.all).toHaveBeenCalledTimes(1);

    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    // 400ms after the last change: debounce timer has not fired yet
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(model.all).toHaveBeenCalledTimes(1);

    // another 500ms (900ms total since the last change): exactly one request
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(model.all).toHaveBeenCalledTimes(2);
  });

  it("resets the timer on every keystroke — pauses shorter than 800ms never trigger a fetch", async () => {
    const model = makeModel();
    render(<ModelDataTable model={model} />);

    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "h" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700); // < 800ms: still resetting
    });
    expect(model.all).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "he" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(model.all).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "hello" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(model.all).toHaveBeenCalledTimes(2);
  });

  it("sends the debounced search value as the quick filter", async () => {
    const model = makeModel();
    render(<ModelDataTable model={model} />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "needle" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(model.all).toHaveBeenCalledTimes(2);
    expect(model.all).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: { quickFilterValues: ["needle"] },
      })
    );
  });
});
