import React, { createRef, RefObject } from 'react';
import { DeepPartial } from 'redux';
import { Canvas } from '../components/canvas/canvas';
import { Editor } from '../components/container/container';
import { DragLayer } from '../components/draggable/drag-layer';
import { I18nProvider } from '../components/i18n/i18n-provider';
import { Sidebar } from '../components/sidebar/sidebar-component';
import { ModelState } from '../components/store/model-state';
import { ModelStore } from '../components/store/model-store';
import { Styles } from '../components/theme/styles';
import { Theme } from '../components/theme/theme';
import { Locale } from '../typings';
import { Layout } from './application-styles';

type Props = {
  state?: DeepPartial<ModelState>,
  styles?: DeepPartial<Styles>,
  locale?: Locale;
};

export class Application extends React.Component<Props> {
  store: RefObject<ModelStore> = createRef();

  render() {
    return (
      <ModelStore ref={this.store} initialState={this.props.state}>
        <I18nProvider locale={this.props.locale}>
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
        </I18nProvider>
      </ModelStore>
    );
  }
}
