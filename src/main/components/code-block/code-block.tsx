import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import { styled } from '../theme/styles';

const EditorWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
`;

export interface CodeBlockProps {
  code: string;
  language: string;
  theme: string;
  fontSize?: number;
  readOnly?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language, 
  theme, 
  fontSize = 12,
  readOnly = true 
}) => {
  return (
    <EditorWrapper style={{ pointerEvents: readOnly ? 'none' : 'auto' }}>
      <MonacoEditor
        value={code}
        language={language}
        theme={theme}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize,
          lineNumbers: readOnly ? 'off' : 'on',
          folding: false,
          automaticLayout: true,
          wordWrap: 'on',
          contextmenu: !readOnly,
          scrollbar: {
            vertical: readOnly ? 'hidden' : 'visible',
            horizontal: readOnly ? 'hidden' : 'visible'
          },
          renderLineHighlight: readOnly ? 'none' : 'all',
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          glyphMargin: false,
          lineDecorationsWidth: 0,
          domReadOnly: readOnly
        }}
      />
    </EditorWrapper>
  );
}; 