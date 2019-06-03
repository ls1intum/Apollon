import React, { createRef, RefObject } from 'react';
import { DeepPartial } from 'redux';
import { Canvas, CanvasComponent } from '../components/canvas/canvas';
import { CanvasProvider, context } from '../components/canvas/canvas-context';
import { Editor } from '../components/container/container';
import { KeyboardEventListener } from '../components/container/keyboard-eventlistener';
import { DraggableLayer } from '../components/draggable/draggable-layer';
import { I18nProvider } from '../components/i18n/i18n-provider';
import { Sidebar } from '../components/sidebar/sidebar-component';
import { ModelState } from '../components/store/model-state';
import { ModelStore } from '../components/store/model-store';
import { Styles } from '../components/theme/styles';
import { Theme } from '../components/theme/theme';
import { UpdatePane } from '../components/update-pane/update-pane';
import { Locale } from '../typings';
import { Layout } from './application-styles';

type Props = {
  state?: DeepPartial<ModelState>;
  styles?: DeepPartial<Styles>;
  locale?: Locale;
};

export class Application extends React.Component<Props> {
  store: RefObject<ModelStore> = createRef();
  canvas: RefObject<CanvasComponent> = createRef();

  componentDidMount() {
    this.forceUpdate();
  }

  render() {
    return (
      <ModelStore ref={this.store} initialState={this.props.state}>
        <I18nProvider locale={this.props.locale}>
          <Theme styles={this.props.styles}>
            <CanvasProvider value={this.canvas.current || context}>
              <DraggableLayer>
                <Layout className="apollon-editor">
                  <Editor>
                    <Canvas ref={this.canvas} />
                  </Editor>
                  <Sidebar />
                  <UpdatePane />
                  <KeyboardEventListener canvas={this.canvas} />
                </Layout>
              </DraggableLayer>
            </CanvasProvider>
          </Theme>
        </I18nProvider>
      </ModelStore>
    );
  }
}
