import { styled } from '../../theme/styles';

export const DropdownMenu = styled.div`
  background-clip: padding-box;
  background-color: ${props => props.theme.color.white};
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.25rem;
  list-style: none;
  margin: 0.125rem 0 0;
  min-width: 100%;
  padding: 0.5rem 0;
  position: absolute;
  text-align: left;
  z-index: 1000;
`;
