import { styled } from '../components/theme/styles';
import { Style } from './svg-styles';

export const Layout = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  min-width: inherit;
  min-height: inherit;
  max-width: inherit;
  max-height: inherit;
  box-sizing: border-box;
  user-select: none;
  position: relative;
  touch-action: none;

  font-family: ${({ theme }) => theme.font.family}, sans-serif;
  font-size: ${({ theme }) => theme.font.size}px;
  color: ${({ theme }) => theme.font.color};
  font-weight: 400;
  line-height: 1.5;
  text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;

  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }

  svg {
    ${Style}
  }
`;
