import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { EditorRepository } from '../../services/editor/editor-repository.js';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types.js';
import { Switch } from '../controls/switch/switch.js';
import { CreatePane } from '../create-pane/create-pane.js';
import { I18nContext } from '../i18n/i18n-context.js';
import { localized } from '../i18n/localized.js';
import { ModelState } from '../store/model-state.js';
import { Container } from './sidebar-styles.js';
import { SelectableState } from '../../services/uml-element/selectable/selectable-types.js';
type OwnProps = {};

type StateProps = {
  readonly: boolean;
  mode: ApollonMode;
  view: ApollonView;
  selected: SelectableState;
  scale: number;
};

type DispatchProps = {
  changeView: typeof EditorRepository.changeView;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      readonly: state.editor.readonly,
      mode: state.editor.mode,
      view: state.editor.view,
      selected: state.selected,
      scale: state.editor.scale,
    }),
    {
      changeView: EditorRepository.changeView,
    },
  ),
);

class SidebarComponent extends Component<Props> {
  render() {
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) return null;

    return (
      <Container scale={this.props.scale} id="modeling-editor-sidebar">
        {this.props.mode === ApollonMode.Exporting && (
          <Switch value={this.props.view} onChange={this.props.changeView} color="primary">
            <Switch.Item value={ApollonView.Modelling}>{this.props.translate('views.modelling')}</Switch.Item>
            <Switch.Item value={ApollonView.Exporting}>{this.props.translate('views.exporting')}</Switch.Item>
          </Switch>
        )}
        {this.props.view === ApollonView.Modelling ? (
          <CreatePane />
        ) : (
          <label htmlFor="toggleInteractiveElementsMode">
            <input
              id="toggleInteractiveElementsMode"
              type="checkbox"
              checked={this.props.view === ApollonView.Exporting}
              onChange={this.toggleInteractiveElementsMode}
            />
            {this.props.translate('views.highlight')}
          </label>
        )}
      </Container>
    );
  }

  toggleInteractiveElementsMode = (event: React.FormEvent<HTMLInputElement>) => {
    const { checked } = event.currentTarget;
    const view: ApollonView = checked ? ApollonView.Exporting : ApollonView.Highlight;

    this.props.changeView(view);
  };
}

export const Sidebar = enhance(SidebarComponent);
