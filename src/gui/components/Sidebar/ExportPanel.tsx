import * as React from "react";
import { connect } from "react-redux";
import { withTheme } from "styled-components";
import Button from "./Button";
import {
    getAllEntities,
    getAllInteractiveElementIds,
    getAllRelationships
} from "../../redux/selectors";
import { ReduxState } from "../../redux/state";
import { Theme } from "../../theme";
import { InteractiveElementsMode, UMLModel } from "../../../core/domain";
import { UUID } from "../../../core/utils";
import { layout, LayoutedDiagram } from "../../../rendering/layouters/diagram";
import { renderDiagram, SvgRenderOptions } from "../../../rendering/renderers/svg";

class ExportPanel extends React.Component<Props> {
    form: HTMLFormElement | null = null;
    canvas: HTMLCanvasElement | null = null;
    anchor: HTMLAnchorElement | null = null;

    export = () => {
        switch (this.form!.fileType.value) {
            case "png":
                this.exportPNG();
                break;

            case "svg":
                this.exportSVG();
                break;

            case "json":
                this.exportJSON();
                break;
        }
    };

    render() {
        return (
            <form ref={ref => (this.form = ref)}>
                <h2>Export</h2>

                <div style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                    <input
                        type="radio"
                        id="ExportFileTypePNG"
                        name="fileType"
                        value="png"
                        defaultChecked
                    />
                    &nbsp;
                    <label htmlFor="ExportFileTypePNG" style={{ cursor: "pointer" }}>
                        PNG
                    </label>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <input type="radio" id="ExportFileTypeSVG" name="fileType" value="svg" />
                    &nbsp;
                    <label htmlFor="ExportFileTypeSVG" style={{ cursor: "pointer" }}>
                        SVG
                    </label>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <input type="radio" id="ExportFileTypeJSON" name="fileType" value="json" />
                    &nbsp;
                    <label htmlFor="ExportFileTypeJSON" style={{ cursor: "pointer" }}>
                        JSON
                    </label>
                </div>

                <div>
                    <br />
                    <Button onClick={this.export}>Export</Button>
                </div>

                <div style={{ display: "none" }}>
                    <canvas ref={ref => (this.canvas = ref)} />
                    <a ref={ref => (this.anchor = ref)}>Download</a>
                </div>
            </form>
        );
    }

    createSVGBlobURL(layoutedDiagram: LayoutedDiagram) {
        const { interactiveElementIds, interactiveElementsMode, theme } = this.props;

        const renderOptions: SvgRenderOptions = {
            shouldRenderElement: (id: UUID) =>
                interactiveElementsMode !== InteractiveElementsMode.Hidden ||
                !interactiveElementIds.has(id),
            fontFamily: theme.fontFamily
        };

        const svg = renderDiagram(layoutedDiagram, renderOptions);
        const svgBlob = new Blob([svg], { type: "image/svg+xml" });
        return URL.createObjectURL(svgBlob);
    }

    exportSVG() {
        const layoutedDiagram = layout(this.props.diagram, 50);
        const svgBlobURL = this.createSVGBlobURL(layoutedDiagram);
        this.downloadFile(svgBlobURL, "diagram.svg");
    }

    exportPNG() {
        const layoutedDiagram = layout(this.props.diagram, 50);

        const image = new Image();
        image.src = this.createSVGBlobURL(layoutedDiagram);

        image.onload = () => {
            const canvas = this.canvas;

            if (canvas === null) {
                return;
            }

            const { width, height } = layoutedDiagram.size;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            const scale = 3;
            canvas.width = width * scale;
            canvas.height = height * scale;

            const context = canvas.getContext("2d")!;
            context.scale(scale, scale);
            context.drawImage(image, 0, 0);

            const fileUrl = canvas.toDataURL("image/png");
            this.downloadFile(fileUrl, "diagram.png");
        };

        image.onerror = error => {
            alert(error);
            console.error(error);
        };
    }

    exportJSON() {
        const state = {
            entities: getAllEntities(this.props.state),
            relationships: getAllRelationships(this.props.state)
        };

        const serializedState = JSON.stringify(state, null, 2);
        const jsonBlob = new Blob([serializedState], { type: "application/json" });
        const jsonBlobURL = URL.createObjectURL(jsonBlob);
        this.downloadFile(jsonBlobURL, "diagram.json");
    }

    downloadFile(url: string, fileName: string) {
        const anchor = this.anchor;
        if (anchor !== null) {
            anchor.href = url;
            anchor.download = fileName;
            anchor.click();
        }
    }
}

interface OwnProps {
    interactiveElementsMode: InteractiveElementsMode;
}

interface StateProps {
    diagram: UMLModel;
    interactiveElementIds: ReadonlySet<UUID>;
    state: ReduxState;
}

interface ThemeProps {
    theme: Theme;
}

type Props = OwnProps & StateProps & ThemeProps;

function mapStateToProps(state: ReduxState) {
    return {
        diagram: {
            entities: getAllEntities(state),
            relationships: getAllRelationships(state)
        },
        interactiveElementIds: getAllInteractiveElementIds(state),
        state
    };
}

export default withTheme(connect(mapStateToProps)(ExportPanel));
