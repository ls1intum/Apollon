import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ColorLegendElement, IColorLegendElement } from '.';
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

const EditorContainer = styled.div`
  height: 400px;
  width: 600px;
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

class ColorLegendUpdateComponent extends Component<Props> {
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

  private onUpdate = (text: string) => {
    const { element, update } = this.props;
    update(element.id, { 
      text,
      code: {
        content: text,
        language: element.language,
        version: '1.0'
      }
    });
  };

  private onLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { element, update } = this.props;
    const newLanguage = event.target.value;
    update(element.id, { 
      language: newLanguage,
      code: {
        content: element.text,
        language: newLanguage,
        version: '1.0'
      }
    });
  };
}

type OwnProps = {
  element: ColorLegendElement;
};

type StateProps = {};

type DispatchProps = {
  update: (id: string, values: Partial<IColorLegendElement>) => void;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
};

export type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: (id: string, values: Partial<IColorLegendElement>) => 
      UMLElementRepository.update(id, values as Partial<IUMLElement>),
    delete: UMLElementRepository.delete,
  }),
);

export const ColorLegendUpdate = enhance(ColorLegendUpdateComponent);
