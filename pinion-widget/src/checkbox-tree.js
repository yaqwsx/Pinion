import React from "react";

export function FlatRootCheckbox(props) {
    let {roots, ...otherProps} = props;
    return roots.map((d, i) =>
            <CheckboxTree key={i} {...d} {...otherProps}/>)
}

export function CheckboxTree(props) {
    let { id, label, checked, expanded, onCheck, onExpand, children } = props;

    let collectChildrenId = ch =>
        ch.flatMap(c => [c.id].concat(collectChildrenId(c.children)));

    return <div className="w-full">
        <input type="checkbox"
               checked={checked}
               onChange={e => onCheck(collectChildrenId([props]), e.target.checked)}/>
        <div className="inline-block w-2 px-2">
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