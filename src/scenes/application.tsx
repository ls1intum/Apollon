import React, { createRef, RefObject } from 'react';
import { Canvas } from '../components/canvas/canvas';
import { Editor } from '../components/container/container';
import { DragLayer } from '../components/draggable/drag-layer';
import { Sidebar } from '../components/sidebar/sidebar-component';
import { ModelState } from '../components/store/model-state';
import { ModelStore } from '../components/store/model-store';
import { Styles } from '../components/theme/styles';
import { Theme } from '../components/theme/theme';
import { Layout } from './application-styles';

export class Application extends React.Component<Props> {
  store: RefObject<ModelStore> = createRef();

  render() {
    return (
      <ModelStore ref={this.store} initialState={this.props.state}>
        <Theme styles={this.props.styles}>
          <DragLayer>
            <Layout className="apollon-editor">
              <Editor>
                <Canvas />
              </Editor>
              <Sidebar />
            </Layout>
          </DragLayer>
        </Theme>
      </ModelStore>
    );
  }
}

interface Props {
  state: ModelState | null;
  styles: Partial<Styles>;
}
