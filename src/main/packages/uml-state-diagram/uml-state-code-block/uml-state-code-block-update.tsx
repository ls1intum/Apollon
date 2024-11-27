import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLStateCodeBlock, IUMLStateCodeBlockElement } from './uml-state-code-block';
import { Button } from '../../../components/controls/button/button';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { IUMLElement } from '../../../services/uml-element/uml-element';
import MonacoEditor from 'react-monaco-editor';

// Styled Components
const EditorContainer = styled.div`
  height: 200px;
  width: 300px;
  border: 1px solid ${(props) => props.theme.color.gray};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
  
  &:focus-within {
    border-color: ${(props) => props.theme.color.primary};
  }
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

// Types
interface OwnProps {
  element: UMLStateCodeBlock;
}

interface StateProps {}

interface DispatchProps {
  update: (id: string, values: Partial<IUMLStateCodeBlockElement>) => void;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

// Component
class UMLStateCodeBlockUpdateComponent extends Component<Props> {
  componentDidMount() {
    const { element, update } = this.props;
    
    // Handle initial state, including JSON imports
    const content = element.code?.content || element.text || '';
    const language = element.code?.language || element.language || 'python';
    const version = element.code?.version || '1.0';

    // Always update to ensure proper initialization
    update(element.id, {
      text: content,
      language: language,
      bounds: {
        ...element.bounds,
        width: element.bounds.width || 380,
        height: element.bounds.height || 220
      },
      code: {
        content: content,
        language: language,
        version: version
      }
    });
  }

  private onUpdate = (text: string) => {
    const { element, update } = this.props;
    
    // Don't update if text is undefined
    if (text === undefined) return;

    const currentVersion = element.code?.version || '1.0';
    const existingLanguage = element.code?.language || element.language || 'python';
    
    update(element.id, {
      text: text,
      language: existingLanguage,
      bounds: element.bounds,
      code: {
        content: text,
        language: existingLanguage,
        version: currentVersion
      }
    });
  };

  private onLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { element, update } = this.props;
    const newLanguage = event.target.value;
    const currentVersion = element.code?.version || '1.0';
    const existingContent = element.code?.content || element.text;
    
    const updatedValues: Partial<IUMLStateCodeBlockElement> = {
      text: existingContent,
      language: newLanguage,
      code: {
        content: existingContent,
        language: newLanguage,
        version: currentVersion
      }
    };
    
    update(element.id, updatedValues);
  };

  render() {
    const { element } = this.props;

    return (
      <div>
        <Controls>
          <select 
            value={element.language}
            onChange={this.onLanguageChange}
            style={{ padding: '4px 8px' }}
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
          </select>
          <Button color="link" onClick={() => this.props.delete(element.id)}>
            <TrashIcon />
          </Button>
        </Controls>
        <EditorContainer>
          <MonacoEditor
            value={element.text}
            onChange={this.onUpdate}
            language={element.language}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              automaticLayout: true,
              wordWrap: 'on',
              theme: 'vs-dark',
              renderLineHighlight: 'all',
              scrollbar: {
                useShadows: false,
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8
              },
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              contextmenu: true,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              parameterHints: {
                enabled: true,
                cycle: true
              },
              formatOnPaste: true,
              formatOnType: true
            }}
          />
        </EditorContainer>
      </div>
    );
  }
}

// Connect & Export
const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: (id: string, values: Partial<IUMLStateCodeBlockElement>) => 
      UMLElementRepository.update(id, values as Partial<IUMLElement>),
    delete: UMLElementRepository.delete,
  }),
);

export const UMLStateCodeBlockUpdate = enhance(UMLStateCodeBlockUpdateComponent);
