import { useContext } from "react";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { AppContext } from "../contexts/AppContext";
import { Tooltip } from "react-tooltip";

const EditorToggleButton = () => {
    const { isEditorVisible, toggleEditorVisibility } = useContext(AppContext);

    return (
        <>
            <button
                onClick={toggleEditorVisibility}
                className={`
        px-4 py-2
        flex items-center justify-center
        rounded-full
        bg-[var(--view-bg-color)]
        cursor-pointer
        transition-all duration-200
        shadow-md
        border border-gray-300/40
        hover:scale-105
        opacity-95
        hover:opacity-100
        active:scale-95
        ${isEditorVisible
            ? "text-red-400 hover:ring-2 hover:ring-red-400 hover:shadow-[0_0_12px_rgba(248,113,113,0.5)]"
            : "text-green-400 hover:ring-2 hover:ring-green-400 hover:shadow-[0_0_12px_rgba(74,222,128,0.5)]"}
    `}
                data-tooltip-id="editor-toggle-tooltip"
                aria-label={isEditorVisible ? "Hide Code Editor" : "Show Code Editor"}
            >
                {isEditorVisible ? (
                    <div className="flex items-center justify-center gap-0.25 transition-colors hover:text-red-400">
                        <BsChevronLeft size={12} />
                        <BsChevronLeft size={12} />
                    </div>
                    ) : (
                    <div className="flex items-center justify-center gap-0.25 transition-colors hover:text-green-400">
                        <BsChevronRight size={12} />
                        <BsChevronRight size={12} />
                    </div>
                    )}

            </button>
            <Tooltip
                id="editor-toggle-tooltip"
                content={isEditorVisible ? "Hide Code Editor" : "Show Code Editor"}
                style={{ fontSize: "12px" }}
            />
        </>
    );
};

export default EditorToggleButton;