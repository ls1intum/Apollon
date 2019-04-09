import { styled } from '../../theme/styles';

export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid ${props => props.theme.color.black};
  box-sizing: content-box;
  height: 0;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  overflow: visible;
`;
