import React, { createRef, RefObject } from 'react';
import { DeepPartial } from 'redux';
import { Canvas, CanvasComponent } from '../components/canvas/canvas';
import { CanvasContext, CanvasProvider } from '../components/canvas/canvas-context';
import { Editor } from '../components/canvas/container';
import { KeyboardEventListener } from '../components/canvas/keyboard-eventlistener';
import { DraggableLayer } from '../components/draggable/draggable-layer';
import { I18nProvider } from '../components/i18n/i18n-provider';
import { Sidebar } from '../components/sidebar/sidebar-component';
import { ModelState, PartialModelState } from '../components/store/model-state';
import { ModelStore, StoreProvider } from '../components/store/model-store';
import { Styles } from '../components/theme/styles';
import { Theme } from '../components/theme/theme';
import { UpdatePane } from '../components/update-pane/update-pane';
import { ILayer } from '../services/layouter/layer';
import { Locale } from './../services/editor/editor-types';
import { Layout } from './application-styles';
import { RootContext, RootProvider } from '../components/root/root-context';

type Props = {
  state?: PartialModelState;
  styles?: DeepPartial<Styles>;
  locale?: Locale;
};

const initialState = Object.freeze({
  canvas: null as ILayer | null,
  root: null as HTMLDivElement | null,
});

type State = typeof initialState;

const SCROLL_BORDER = 200;

export class Application extends React.Component<Props, State> {
  state = initialState;

  store: RefObject<ModelStore> = createRef();

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
          <StoreProvider ref={this.store} initialState={this.props.state}>
            <I18nProvider locale={this.props.locale}>
              <Theme styles={this.props.styles}>
                <Layout className="apollon-editor" ref={this.setLayout}>
                  {rootContext && (
                    <DraggableLayer>
                      <Editor
                        onTouchStart={this.deactivateScrolling}
                        onTouchMove={this.preventDefault}
                        onTouchEnd={this.activateScrolling}
                      >
                        <Canvas ref={this.setCanvas} />
                      </Editor>
                      {canvasContext && (
                        <>
                          <Sidebar />
                          <UpdatePane />
                          <KeyboardEventListener />
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

  preventDefault = (event: React.TouchEvent) => {
    const target = event.currentTarget;
    if (target) {
      const clientRect = target.getBoundingClientRect();

      const scrollDistance = SCROLL_BORDER + 5;

      const touch = event.touches[event.touches.length - 1];

      // scroll when on the edge of the element
      const scrollHorizontally =
        touch.clientX < clientRect.x - SCROLL_BORDER || touch.clientX > clientRect.x + clientRect.width - SCROLL_BORDER
          ? scrollDistance
          : 0;
      const scrollVertically =
        touch.clientY < clientRect.y - SCROLL_BORDER || touch.clientY > clientRect.y + clientRect.height - SCROLL_BORDER
          ? scrollDistance
          : 0;
      // target.scrollBy(scrollHorizontally, scrollVertically);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  activateScrolling = (event: React.TouchEvent) => {
    const target = event.currentTarget;
    if (target) {
      (target as HTMLElement).style.overflow = 'auto';
      // document.body.style.overflowY = 'auto';
      (target as HTMLElement).style.overscrollBehavior = 'auto';
    }
  };

  deactivateScrolling = (event: React.TouchEvent) => {
    const target = event.currentTarget;
    // delay it by a cycle -> state is correctly updated
    if (target && this.store.current && this.store.current.state.store) {
      const modelState: ModelState = this.store.current!.state.store.getState();

      const deactivateScroll =
        modelState.moving.length > 0 ||
        modelState.connecting.length > 0 ||
        Object.keys(modelState.reconnecting).length > 0;

      if (true) {
        (target as HTMLElement).style.overflow = 'hidden';
        // document.body.style.overflowY = 'hidden';
        (target as HTMLElement).style.overscrollBehavior = 'none';
      }
    }
  };

  scroll = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    // prevent site refresh
    // event.currentTarget.style.overflow = 'hidden';
    if (this.store.current && this.store.current.state.store) {
      console.log('scrolling');

      const modelState: ModelState = this.store.current.state.store.getState();
      const shouldScroll = modelState.moving.length > 0;

      if (shouldScroll) {
        console.log('scrolling');
      }
    }
  };
}
