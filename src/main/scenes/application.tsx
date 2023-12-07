import React from 'react';
import { DeepPartial } from 'redux';
import { Canvas, CanvasComponent } from '../components/canvas/canvas';
import { CanvasContext, CanvasProvider } from '../components/canvas/canvas-context';
import { Editor } from '../components/canvas/editor';
import { KeyboardEventListener } from '../components/canvas/keyboard-eventlistener';
import { DraggableLayer } from '../components/draggable/draggable-layer';
import { I18nProvider } from '../components/i18n/i18n-provider';
import { Sidebar } from '../components/sidebar/sidebar-component';
import { PartialModelState } from '../components/store/model-state';
import { ModelStore, StoreProvider } from '../components/store/model-store';
import { Styles } from '../components/theme/styles';
import { Theme } from '../components/theme/theme';
import { UpdatePane } from '../components/update-pane/update-pane';
import { ILayer } from '../services/layouter/layer';
import { Locale } from '../services/editor/editor-types';
import { Layout } from './application-styles';
import { RootContext, RootProvider } from '../components/root/root-context';
import { UMLModel } from '../typings';
import { Patcher } from '../services/patcher';
import { MouseEventListener } from '../components/canvas/mouse-eventlistener';

type Props = {
  patcher: Patcher<UMLModel>;
  state?: PartialModelState;
  styles?: DeepPartial<Styles>;
  locale?: Locale;
};

const initialState = Object.freeze({
  canvas: null as ILayer | null,
  root: null as HTMLDivElement | null,
});

type State = typeof initialState;

export class Application extends React.Component<Props, State> {
  state = initialState;

  store?: ModelStore;

  private resolveInitialized: () => void = () => undefined;
  private initializedPromise: Promise<void> = new Promise((resolve) => {
    this.resolveInitialized = resolve;
  });

  setCanvas = (ref: CanvasComponent) => {
    if (ref && ref.layer.current) {
      this.setState({ canvas: { ...ref, layer: ref.layer.current } });
    }
  };

  setLayout = (ref: HTMLDivElement) => {
    if (ref) {
      this.setState({ root: ref });
    }
  };

  render() {
    const canvasContext: CanvasContext | null = this.state.canvas ? { canvas: this.state.canvas } : null;
    const rootContext: RootContext | null = this.state.root ? { root: this.state.root } : null;

    return (
      <CanvasProvider value={canvasContext}>
        <RootProvider value={rootContext}>
          <StoreProvider
            initialState={this.props.state}
            patcher={this.props.patcher}
            ref={(ref) => {
              this.store ??= ref as ModelStore;
              this.resolveInitialized();
            }}
          >
            <I18nProvider locale={this.props.locale}>
              <Theme styles={this.props.styles}>
                <Layout className="apollon-editor" ref={this.setLayout}>
                  {rootContext && (
                    <DraggableLayer>
                      {canvasContext && (
                        <>
                          <UpdatePane />
                          <Sidebar />
                          <KeyboardEventListener />
                        </>
                      )}
                      <Editor>
                        <Canvas ref={this.setCanvas} />
                      </Editor>
                      {canvasContext && (
                        <>
                          <MouseEventListener />
                        </>
                      )}
                    </DraggableLayer>
                  )}
                </Layout>
              </Theme>
            </I18nProvider>
          </StoreProvider>
        </RootProvider>
      </CanvasProvider>
    );
  }

  get initialized(): Promise<void> {
    return this.initializedPromise;
  }
}
