import { Component, ReactElement, createElement } from "react";
import { findDOMNode } from "react-dom";
import * as dijitRegistry from "dijit/registry";
import * as classNames from "classnames";
import * as dojoLang from "dojo/_base/lang";
import * as dojoConnect from "dojo/_base/connect";

import { DropdownFilter, DropdownFilterProps } from "./DropdownFilter";
import { ValidateConfigs } from "./ValidateConfigs";

export interface DropdownFilterContainerProps {
    entity: string;
    mxform: mxui.lib.form._FormBase;
    targetGridName: string;
    filters: FilterProps[];
}

export interface FilterProps {
    caption: string;
    filterBy: filterOptions;
    attribute: string;
    value: string;
    constraint: string;
    filterMethod: filterMethodOptions;
}

type filterMethodOptions = "equals" | "contains";
export type filterOptions = "attribute" | "XPath";
type HybridConstraint = Array<{ attribute: string; operator: string; value: string; path?: string; }>;

export interface ListView extends mxui.widget._WidgetBase {
    datasource: {
        xpathConstraints: string;
    };
    _datasource: {
        _constraints: HybridConstraint | string;
        _entity: string;
        _setSize: number;
        atEnd: () => boolean;
        _pageSize: number;
    };
    _loadMore: () => void;
    _onLoad: () => void;
    _renderData: () => void;
    update: () => void;
}

export interface DropdownFilterState {
    widgetAvailable: boolean;
    targetListView?: ListView;
    targetNode?: HTMLElement;
    validationPassed?: boolean;
    value?: string;
}

export default class DropdownFilterContainer extends Component<DropdownFilterContainerProps, DropdownFilterState> {

    constructor(props: DropdownFilterContainerProps) {
        super(props);

        this.state = { widgetAvailable: true };
        this.handleChange = this.handleChange.bind(this);
        dojoConnect.connect(props.mxform, "onNavigation", this, dojoLang.hitch(this, this.initDropdownFilter));
    }

    render() {
        return createElement("div",
            {
                className: classNames("widget-dropdown-filter")
            },
            createElement(ValidateConfigs, {
                ...this.props as DropdownFilterContainerProps,
                filterNode: this.state.targetNode,
                filters: this.props.filters,
                targetGridName: this.props.targetGridName,
                targetListView: this.state.targetListView,
                validate: !this.state.widgetAvailable
            }),
            this.renderDropdownFilter()
        );
    }

    private renderDropdownFilter(): ReactElement<DropdownFilterProps> {
        if (this.state.validationPassed) {
            return createElement(DropdownFilter, {
                filters: this.props.filters,
                handleChange: this.handleChange
            });
        }

        return null;
    }

    private handleChange(value: string, attribute: string, filterBy: filterOptions, constraint: string, filterMethod: string) {
        if (value === "(empty)") {
            this.setState({ value: "" });
        } else {
            if (filterBy === "attribute") {
                this.updateByConstraint(value, attribute, filterMethod);
            } else {
                this.updateByXpath(constraint);
            }
            this.state.targetListView.update();
        }
    }

    private updateByXpath(constraint: string) {
        this.state.targetListView.datasource.xpathConstraints = constraint;
    }

    private updateByConstraint(value: string, attribute: string, filterMethod: string) {
        const constraints: HybridConstraint = [];
        if (this.state.targetListView && this.state.targetListView._datasource) {
            const datasource = this.state.targetListView._datasource;
            if (window.device) {
                constraints.push({
                    attribute,
                    operator: filterMethod,
                    path: this.props.entity,
                    value
                });
                datasource._constraints = value ? constraints : [];
            } else {
                let constraint: HybridConstraint | string = [];
                constraint = `${filterMethod}(${attribute},'${value}')`;
                datasource._constraints = value ? "[" + constraint + "]" : "";
            }
            this.state.targetListView.update();
        }
    }

    private initDropdownFilter() {
        const filterNode = findDOMNode(this).parentNode as HTMLElement;
        const targetNode = ValidateConfigs.findTargetNode(this.props, filterNode);
        let targetListView: ListView | null = null;

        if (targetNode) {
            this.setState({ targetNode });
            targetListView = dijitRegistry.byNode(targetNode);
            if (targetListView) {
                this.setState({ targetListView });
            }
        }
        const validateMessage = ValidateConfigs.validate({
            ...this.props as DropdownFilterContainerProps,
            filterNode: targetNode,
            targetGridName: this.props.targetGridName,
            targetListView,
            validate: true
        });
        this.setState({ widgetAvailable: false, validationPassed: !validateMessage });
    }
}
