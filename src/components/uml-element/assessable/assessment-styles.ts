import { CheckIcon } from '../../controls/icon/check';
import { ExclamationIcon } from '../../controls/icon/exclamation';
import { TimesIcon } from '../../controls/icon/times';
import { styled } from '../../theme/styles';

const ICON_SIZE = 24;

export const Container = styled.circle.attrs(props => ({
  r: ICON_SIZE / 2 + 4,
  fillOpacity: 0.8,
  fill: props.theme.color.gray200,
}))``;

const icon = {
  x: -ICON_SIZE / 2,
  y: -ICON_SIZE / 2,
  width: ICON_SIZE,
  height: ICON_SIZE,
};

export const CorrectIcon = styled(CheckIcon).attrs(icon)`
  fill: green;
`;

export const WrongIcon = styled(TimesIcon).attrs(icon)`
  fill: red;
`;

export const FeedbackIcon = styled(ExclamationIcon).attrs(icon)`
  fill: blue;
`;
