import styled from "styled-components";

const BlockInput = styled.input`
    display: block;
    width: 100%;
    font-size: 0.9rem;
    font-family: ${props => props.theme.fontFamily};
    padding: 5px 8px;
    border: 1px solid #ccc;
    border-radius: 3px;

    ::placeholder {
        color: #aaaaaa;
    }

    & + & {
        margin-top: 7px;
    }

    &:focus {
        border-color: ${props => props.theme.highlightBorderColor};
        box-shadow: 0 0 0 2px ${props => props.theme.highlightColor};
        outline: none;
    }
`;

export default BlockInput;
