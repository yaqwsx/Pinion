import React from "react";
import './pinion-widget.scoped.css';

export function FlatRootCheckbox(props) {
    let {roots, sideBySide, ...otherProps} = props;
    return <div className={sideBySide ? "flex flex-wrap" : ""}>
    {
        roots.map((d, i) =>
            <CheckboxTree key={i}
                              {...d}
                              {...otherProps}
                              className={sideBySide ? "flex-auto" : "w-full" } />)
    }
    </div>;
}

export function CheckboxTree(props) {
    let { id, label, checked, expanded, onCheck, onExpand, children, className } = props;

    let collectChildrenId = ch =>
        ch.flatMap(c => [c.id].concat(collectChildrenId(c.children)));

    return <div className={className}>
        <input type="checkbox"
               checked={checked}
               onChange={e => onCheck(collectChildrenId([props]), !checked)}/>
        <div className="inline-block w-2 px-2"
             onClick={ () => onExpand(id, !expanded) }>
            {
                children.length > 0 ? (expanded ? <i className="arrow down"></i> : <i className="arrow right"></i>) : '\u00A0'
            }
        </div>
        {
            React.cloneElement(label, {
                "onClick": () => onExpand(id, !expanded)
            })
        }
        {
            /* Note that we hide the element and always render them to get
               stable width of the tree */
            <div className={"w-full pl-4 " + (expanded ? "" : "h-0 overflow-hidden")}>
                {
                    children.map( (description, i) =>
                        <CheckboxTree {...description}
                                       key={i}
                                       onCheck={onCheck}
                                       onExpand={onExpand}/>)
                }
            </div>
        }
    </div>
}