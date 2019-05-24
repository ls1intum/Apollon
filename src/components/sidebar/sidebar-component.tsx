import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { EditorRepository } from '../../services/editor/editor-repository';
import { ApollonView } from '../../services/editor/editor-types';
import { ApollonMode } from '../../typings';
import { Switch } from '../controls/switch/switch';
import { CreatePane } from '../create-pane/create-pane';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { Container } from './sidebar-styles';

type OwnProps = {};

type StateProps = {
  readonly: boolean;
  mode: ApollonMode;
  view: ApollonView;
};

type DispatchProps = {
  changeView: typeof EditorRepository.changeView;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      readonly: state.editor.readonly,
      mode: state.editor.mode,
      view: state.editor.view,
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
      <Container>
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
