import styled from 'styled-components';

type Props = {
  color?: string;
  selected?: boolean;
};

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px 0;
  background-color: white;
  border: 1px solid ${(props) => props.theme.color.gray};
`;

export const Color = styled.button.attrs<Props>({})<Props>`
  height: 28px;
  width: 28px;
  background-color: ${({ color, selected }: Props) => (selected ? 'transparent' : color || 'black')};
  border-radius: 14px;
  cursor: pointer;
  border: none;
  position: relative;
  &:after,
  &:before {
    content: '';
    width: 2px;
    height: 100%;
    background: ${(props) => props.theme.color.primaryContrast};
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%) rotate(45deg);
    display: ${({ selected }: Props) => (selected ? 'block' : 'none')};
  }
  &:before {
    transform: translate(-50%) rotate(-45deg);
  }
`;

export const Row = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 16px;
  /* border-bottom: 1px solid #353d47; */
  font-weight: bold;
  background-color: ${(props) => props.theme.color.background};
  color: ${(props) => props.theme.color.primaryContrast};
  &:last-of-type {
    border-bottom: none;
  }
`;

export const Divider = styled.div`
  width: 100%;
  background: ${(props) => props.theme.color.backgroundVariant};
  height: 1px;
`;

export const Button = styled.button`
  background: white;
  color: #212529;
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 0.375rem 0.75rem;
  margin: 0;
  margin-top: 0.75rem;
  line-height: 1.5;
  outline: none;
  align-self: center;
  cursor: pointer;
`;
