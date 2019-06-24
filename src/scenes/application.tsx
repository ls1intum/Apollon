import React, { createRef, RefObject } from 'react';
import { DeepPartial } from 'redux';
import { Canvas, CanvasComponent } from '../components/canvas/canvas';
import { CanvasContext, CanvasProvider } from '../components/canvas/canvas-context';
import { Editor } from '../components/canvas/container';
import { KeyboardEventListener } from '../components/canvas/keyboard-eventlistener';
import { DraggableLayer } from '../components/draggable/draggable-layer';
import { I18nProvider } from '../components/i18n/i18n-provider';
import { Sidebar } from '../components/sidebar/sidebar-component';
import { ModelState } from '../components/store/model-state';
import { ModelStore, StoreProvider } from '../components/store/model-store';
import { Styles } from '../components/theme/styles';
import { Theme } from '../components/theme/theme';
import { UpdatePane } from '../components/update-pane/update-pane';
import { ILayer } from '../services/layouter/layer';
import { Locale } from '../typings';
import { Layout } from './application-styles';

type Props = {
  state?: DeepPartial<ModelState>;
  styles?: DeepPartial<Styles>;
  locale?: Locale;
};

const initialState = Object.freeze({
  canvas: null as ILayer | null,
});

type State = typeof initialState;

export class Application extends React.Component<Props, State> {
  state = initialState;

  store: RefObject<ModelStore> = createRef();

  setCanvas = (ref: CanvasComponent) => {
    if (ref && ref.layer.current) {
      this.setState({ canvas: { ...ref, layer: ref.layer.current } });
    }
  };

  render() {
    const context: CanvasContext | null = this.state.canvas ? { canvas: this.state.canvas } : null;

    return (
      <CanvasProvider value={context}>
        <StoreProvider ref={this.store} initialState={this.props.state}>
          <I18nProvider locale={this.props.locale}>
            <Theme styles={this.props.styles}>
              <DraggableLayer>
                <Layout className="apollon-editor">
                  <Editor>
                    <Canvas ref={this.setCanvas} />
                  </Editor>
                  {context && (
                    <>
                      <Sidebar />
                      <UpdatePane />
                      <KeyboardEventListener />
                    </>
                  )}
                </Layout>
              </DraggableLayer>
            </Theme>
          </I18nProvider>
        </StoreProvider>
      </CanvasProvider>
    );
  }
}
