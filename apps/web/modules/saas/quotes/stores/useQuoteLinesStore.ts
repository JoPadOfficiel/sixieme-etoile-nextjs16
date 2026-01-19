import { temporal } from "zundo";
import { create } from "zustand";
import { type QuoteLine, getLineId } from "../components/yolo/dnd-utils";

interface QuoteLinesState {
	lines: QuoteLine[];
	setLines: (lines: QuoteLine[]) => void;
	updateLine: (id: string, data: Partial<QuoteLine>) => void;
}

export const useQuoteLinesStore = create<QuoteLinesState>()(
	temporal(
		(set) => ({
			lines: [],
			setLines: (lines) => set({ lines }),
			updateLine: (id, data) =>
				set((state) => ({
					lines: state.lines.map((line) =>
						getLineId(line) === id ? { ...line, ...data } : line,
					),
				})),
		}),
		{
			limit: 50,
		},
	),
);
