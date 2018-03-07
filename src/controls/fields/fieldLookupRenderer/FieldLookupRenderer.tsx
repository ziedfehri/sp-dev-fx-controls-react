import { override } from '@microsoft/decorators';
import * as React from 'react';
import { css, Dialog, DialogType, Link, Spinner, SpinnerSize } from 'office-ui-fabric-react';

import { ISPFieldLookupValue } from "../../../common/SPEntities";
import { IFieldRendererProps } from '../fieldCommon/IFieldRendererProps';
import * as appInsights from '../../../common/appInsights';

import styles from './FieldLookupRenderer.module.scss';
import IFrameDialog from '../../iFrameDialog/IFrameDialog';
import { SPHelper } from '../../../Utilities';
import { IContext } from '../../../Common';

/**
 * Field Lookup Renderer Props
 * There are 3 options to provide the props:
 * - [recommended, used in FieldRendererHelper] Provide fieldId and context. In that case request for DispUrl will be sent only if a user clicks on the value
 * - Provide dispFormUrl: if you know this URL a priori you can provide it into the renderer
 * - Provide onClick handler to handle value's click event outside the renderer
 */
export interface IFieldLookupRendererProps extends IFieldRendererProps {
    /**
     * lookup values
     */
    lookups: ISPFieldLookupValue[];
    /**
     * url of Display form for the list that is referenced in the lookup
     */
    dispFormUrl?: string;
    /**
     * custom event handler of lookup item click. If not set the dialog with Display Form will be shown
     */
    onClick?: (args: IFieldLookupClickEventArgs) => {};
    /**
     * Field's id.
     */
    fieldId?: string;
    /**
     * Customizer context. Must be providede if fieldId is set
     */
    context?: IContext;
}

/**
 * Field Lookup Renderer State
 */
export interface IFieldLookupRendererState {
    hideDialog?: boolean;
    lookupDispFormUrl?: string;
    dispFormUrl?: string;
}

/**
 * Lookup click event arguments
 */
export interface IFieldLookupClickEventArgs {
    lookup?: ISPFieldLookupValue;
}

/**
 * Field Lookup Renderer.
 * Used for:
 *   - Lookup, LookupMulti
 */
export class FieldLookupRenderer extends React.Component<IFieldLookupRendererProps, IFieldLookupRendererState> {
    public constructor(props: IFieldLookupRendererProps, state: IFieldLookupRendererState) {
        super(props, state);

        appInsights.track('FieldLookupRenderer', {});

        this.state = {
            hideDialog: true,
            dispFormUrl: props.dispFormUrl
        };
    }

    @override
    public render(): JSX.Element {
        const lookupLinks: JSX.Element[] = this.props.lookups.map((lookup) => {
            return <Link onClick={this._onClick.bind(this, lookup)} className={styles.lookup} style={this.props.cssProps}>{lookup.lookupValue}</Link>;
        });
        return (
            <div style={this.props.cssProps} className={css(this.props.className)}>{lookupLinks}
                {!this.state.hideDialog && this.state.dispFormUrl && <IFrameDialog
                    url={this.state.lookupDispFormUrl}
                    iframeOnLoad={this._onIframeLoaded.bind(this)}
                    hidden={this.state.hideDialog}
                    onDismiss={this._onDialogDismiss.bind(this)}
                    modalProps={{
                        isBlocking: true,
                        containerClassName: styles.dialogContainer
                    }}
                    dialogContentProps={{
                        type: DialogType.close,
                        showCloseButton: true
                    }}
                    width={'570px'}
                    height={'315px'} />}
                {!this.state.hideDialog && !this.state.dispFormUrl && <Dialog
                    onDismiss={this._onDialogDismiss.bind(this)}
                    modalProps={{
                        isBlocking: true,
                        containerClassName: styles.dialogContainer
                    }}
                    dialogContentProps={{
                        type: DialogType.close,
                        showCloseButton: true
                    }}>
                        <Spinner size={SpinnerSize.large} />
                    </Dialog>}
            </div>);
    }

    private _onClick(lookup: ISPFieldLookupValue): void {
        if (this.props.onClick) {
            const args: IFieldLookupClickEventArgs = {
                lookup: lookup
            };
            this.props.onClick(args);
            return;
        }

        //
        // showing Display Form in the dialog
        //
        if (this.state.dispFormUrl) {
            this.setState({
                lookupDispFormUrl: `${this.state.dispFormUrl}&ID=${lookup.lookupId}&RootFolder=*&IsDlg=1`,
                hideDialog: false
            });
        }
        else if (this.props.fieldId) {

            this.setState({
                hideDialog: false
            });

            SPHelper.getLookupFieldListDispFormUrl(this.props.fieldId, this.props.context).then(dispFormUrlValue => {
                const dispFormUrl: string = dispFormUrlValue.toString();
                this.setState((prevState, props) => {
                    if (prevState.hideDialog) {
                        return;
                    }

                    return {
                        dispFormUrl: dispFormUrl,
                        lookupDispFormUrl: `${dispFormUrl}&ID=${lookup.lookupId}&RootFolder=*&IsDlg=1`
                    };
                });
            });
        }
    }

    private _onIframeLoaded(iframe: any): void {
        //
        // some additional configuration to beutify content of the iframe
        //
        const iframeWindow: Window = iframe.contentWindow;
        const iframeDocument: Document = iframeWindow.document;

        const s4Workspace: HTMLDivElement = iframeDocument.getElementById('s4-workspace') as HTMLDivElement;
        s4Workspace.style.height = iframe.style.height;

        s4Workspace.scrollIntoView();
    }

    private _onDialogDismiss(): void {
        this.setState({
            hideDialog: true
        });
    }
}
