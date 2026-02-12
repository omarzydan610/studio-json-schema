import { useContext, useState, useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { type SchemaObject } from "@hyperjump/json-schema/draft-2020-12";
import {
  getSchema,
  compile,
  buildSchemaDocument,
  type CompiledSchema,
  type SchemaDocument,
} from "@hyperjump/json-schema/experimental";

import Editor from "@monaco-editor/react";
import defaultSchema from "../data/defaultJSONSchema.json";
import { AppContext } from "../contexts/AppContext";
import SchemaVisualization from "./SchemaVisualization";
import FullscreenToggleButton from "./FullscreenToggleButton";
import EditorToggleButton from "./EditorToggleButton";
import { parseSchema } from "../utils/parseSchema";
import YAML from "js-yaml";
import type { JSONSchema } from "@apidevtools/json-schema-ref-parser";

type ValidationStatus = {
  status: "success" | "warning" | "error";
  message: string;
};

type CreateBrowser = (
  id: string,
  schemaDoc: SchemaDocument
) => {
  _cache: Record<string, SchemaDocument>;
};

const DEFAULT_SCHEMA_ID = "https://studio.ioflux.org/schema";
const DEFAULT_SCHEMA_DIALECT =
  "https://json-schema.org/draft/2020-12/schema";
const SESSION_SCHEMA_KEY = "ioflux.schema.editor.content";
const SESSION_FORMAT_KEY = "ioflux.schema.editor.format";

const JSON_SCHEMA_DIALECTS = [
  "https://json-schema.org/draft/2020-12/schema",
  "https://json-schema.org/draft/2019-09/schema",
  "http://json-schema.org/draft-07/schema#",
  "http://json-schema.org/draft-06/schema#",
  "http://json-schema.org/draft-04/schema#",
];

const SUPPORTED_DIALECTS = [
  "https://json-schema.org/draft/2020-12/schema",
];

const VALIDATION_UI = {
  success: {
    message: "✓ Valid JSON Schema",
    className: "text-green-400 font-semibold",
  },
  warning: {
    message: `⚠ Schema dialect not provided. Using default dialect: ${DEFAULT_SCHEMA_DIALECT}`,
    className: "text-yellow-400",
  },
  error: {
    message: "✗ ",
    className: "text-red-400",
  },
};

type SchemaFormat = "json" | "yaml";

const saveFormat = (key: string, format: SchemaFormat) => {
  sessionStorage.setItem(key, format);
};

const loadSchemaJSON = (key: string): any => {
  const raw = sessionStorage.getItem(key);
  if (!raw) return defaultSchema;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultSchema;
  }
};

const saveSchemaJSON = (key: string, schema: JSONSchema) => {
  sessionStorage.setItem(key, JSON.stringify(schema, null, 2));
};

const MonacoEditor = () => {
  const {
    theme,
    isFullScreen,
    containerRef,
    schemaFormat,
    isEditorVisible,
    toggleEditorVisibility,
  } = useContext(AppContext);

  const editorPanelRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);


  const [compiledSchema, setCompiledSchema] =
    useState<CompiledSchema | null>(null);

  const initialSchemaJSON = loadSchemaJSON(SESSION_SCHEMA_KEY);

  const [schemaText, setSchemaText] = useState<string>(
    schemaFormat === "yaml"
      ? YAML.dump(initialSchemaJSON)
      : JSON.stringify(initialSchemaJSON, null, 2)
  );

  const [schemaValidation, setSchemaValidation] =
    useState<ValidationStatus>({
      status: "success",
      message: VALIDATION_UI.success.message,
    });

  /* 🔹 Resize editor instead of unmounting */
  useEffect(() => {
    if (!editorPanelRef.current) return;

    wrapperRef.current?.classList.add("panel-animating");

    if (isEditorVisible) {
      editorPanelRef.current.resize(25);
    } else {
      editorPanelRef.current.resize(2);
    }

    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      wrapperRef.current?.classList.remove("panel-animating");
    }, 310);
    return () => clearTimeout(timer);
  }, [isEditorVisible]);

  useEffect(() => {
    saveFormat(SESSION_FORMAT_KEY, schemaFormat);

    const schemaJSON = loadSchemaJSON(SESSION_SCHEMA_KEY);

    setSchemaText(
      schemaFormat === "yaml"
        ? YAML.dump(schemaJSON)
        : JSON.stringify(schemaJSON, null, 2)
    );
  }, [schemaFormat]);

  useEffect(() => {
    if (!schemaText.trim()) return;

    const timeout = setTimeout(async () => {
      try {
        const parsedSchema = parseSchema(schemaText, schemaFormat);
        const copy = structuredClone(parsedSchema);

        const dialect = parsedSchema.$schema;
        const dialectVersion = dialect ?? DEFAULT_SCHEMA_DIALECT;
        const schemaId = parsedSchema.$id ?? DEFAULT_SCHEMA_ID;

        if (
          JSON_SCHEMA_DIALECTS.includes(dialectVersion) &&
          !SUPPORTED_DIALECTS.includes(dialectVersion)
        ) {
          throw new Error(
            `Dialect "${dialectVersion}" is not supported yet.`
          );
        }

        const schemaDocument = buildSchemaDocument(
          parsedSchema as SchemaObject,
          schemaId,
          dialectVersion
        );

        const createBrowser: CreateBrowser = (id, schemaDoc) => ({
          _cache: { [id]: schemaDoc },
        });

        const browser = createBrowser(schemaId, schemaDocument);

        const schema = await getSchema(
          schemaDocument.baseUri,
          browser
        );

        setCompiledSchema(await compile(schema));

        setSchemaValidation(
          !dialect && typeof parsedSchema !== "boolean"
            ? {
              status: "warning",
              message: VALIDATION_UI.warning.message,
            }
            : {
              status: "success",
              message: VALIDATION_UI.success.message,
            }
        );

        saveSchemaJSON(SESSION_SCHEMA_KEY, copy);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);

        setSchemaValidation({
          status: "error",
          message: VALIDATION_UI.error.message + message,
        });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [schemaText, schemaFormat]);

  return (
    <div ref={(el) => { wrapperRef.current = el; if (typeof containerRef === 'function') containerRef(el); else if (containerRef) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }} className="h-[92vh] flex flex-col">
      {isFullScreen && (
        <div className="w-full px-1 bg-[var(--view-bg-color)]">
          <div className="text-[var(--view-text-color)]">
            <FullscreenToggleButton />
          </div>
        </div>
      )}



      <PanelGroup direction="horizontal">
        {/* EDITOR PANEL (always mounted) */}
        <Panel
          ref={editorPanelRef}
          minSize={0}
          defaultSize={25}
          className="flex flex-col"
        >
          <Editor
            height="90%"
            width="100%"
            language={schemaFormat}
            value={schemaText}
            theme={theme === "light" ? "vs-light" : "vs-dark"}
            options={{
              minimap: { enabled: false },
              occurrencesHighlight: "off",
            }}
            onChange={(value) => setSchemaText(value ?? "")}
          />

          <div className="flex-1 p-2 bg-[var(--validation-bg-color)] text-sm overflow-y-auto">
            <div className={VALIDATION_UI[schemaValidation.status].className}>
              {schemaValidation.message}
            </div>
          </div>
        </Panel>

        {/* RESIZE HANDLE with Toggle Button */}
        <PanelResizeHandle className="w-[1px] bg-gray-400 relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <EditorToggleButton />
          </div>
        </PanelResizeHandle>

        {/* VISUALIZATION PANEL */}
        <Panel
          minSize={60}
          className="flex flex-col bg-[var(--visualize-bg-color)]"
        >
          <SchemaVisualization compiledSchema={compiledSchema} />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default MonacoEditor;
