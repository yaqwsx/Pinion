import {useState, useEffect} from "react";
import useDimensions from "react-cool-dimensions";
import GridLoader from "react-spinners/GridLoader";
import { css } from "@emotion/react";
import ReactMarkdown from 'react-markdown'
import './pinion-widget.scoped.css';
import {FlatRootCheckbox} from "./checkbox-tree";
import _ from "lodash";

const loaderCss = css`
  display: block;
  margin: 30px auto;
  border-color: black;
`;


async function fetchJson(path) {
    let response = await fetch(path);
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    if (response.status !== 200) {
        let text = await response.text();
        throw new Error(`Response: ${response.status}: ${text}`);
    }
    return await response.json();
}

function bboxToPoly(bbox) {
    return [
        bbox.tl,
        [bbox.tl[0], bbox.br[1]],
        bbox.br,
        [bbox.br[0], bbox.tl[1]]
    ]
}

function PcbMap(props) {
    const { observe, width, height, entry } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            unobserve();
            observe();
        },
    });

    let {area, src, transform, hotspots, className,
         htmlAnnotations, svgAnnotations, ...others} = props;

    let mapX = x => 0;
    let mapY = y => 0;
    let overlayStyle = {};
    let overlayViewbox = "0 0 0 0";
    if (entry) {
        let imgTarget = entry.target;
        overlayStyle = {
            height: height,
            width: width,
            left: imgTarget.offsetLeft,
            top: imgTarget.offsetTop
        };
        overlayViewbox = `${area.tl[0]} ${area.tl[1]} ${area.br[0] - area.tl[0]} ${area.br[1] - area.tl[1]}`;
        mapX = x => (transform([x, 0])[0] - area.tl[0]) / (area.br[0] - area.tl[0]) * width + imgTarget.offsetLeft;
        mapY = y => (transform([0, y])[1] - area.tl[1]) / (area.br[1] - area.tl[1]) * height + imgTarget.offsetTop;
    }

    return <div className={"max-w-max relative top-0 left-0 h-full max-h-full " + className} {...others}>
        <img src={src}
                alt="PCB Preview"
                className="tight-shadow max-h-full"
                ref={observe}/>
        {/* SVG for drawing annotations */}
        <svg className="absolute top-0 left-0"
            style={overlayStyle}
            viewBox={overlayViewbox}>
        {
            props.svgAnnotations ? props.svgAnnotations : null
        }
        </svg>
        {
            htmlAnnotations.map((tooltip, i) =>
                <PcbHtmlAnnotation
                    key={i}
                    mapX={mapX} mapY={mapY}
                    pos={tooltip.pos} content={tooltip.content}/>
            )
        }
        {/* SVG with hotspots */}
        <svg className="absolute top-0 left-0"
            style={overlayStyle}
            viewBox={overlayViewbox}>
        {
            hotspots.map((spot, idx) => {
                return <PcbHotSpot  key={idx}
                                    shape={spot.shape}
                                    transform={transform}
                                    onHoverStart={spot.onHoverStart}
                                    onHoverEnd={spot.onHoverEnd}
                                    onClick={spot.onClick}/>;
            })
        }
        </svg>
    </div>
}

function PcbHotSpot(props) {
    let polySpec = props.shape
        .map(p => props.transform(p))
        .map(p => `${p[0]},${p[1]}`).join(" ");
    return <polygon
            points={polySpec}
            style={{"fill": "rgba(0,0,0,0)"}}
            strokeWidth="1"
            stroke="rgba(0,0,0,0)"
            onMouseEnter={e => props.onHoverStart ? props.onHoverStart(e) : null}
            onMouseLeave={e => props.onHoverEnd ? props.onHoverEnd(e) : null}
            onTouchStart={e => props.onHoverStart ? props.onHoverStart(e) : null}
            onTouchEnd={e => props.onHoverEnd ? props.onHoverEnd(e) : null}
            onTouchMove={e => {
                let touches = e.nativeEvent.changedTouches;
                var target = document.elementFromPoint(touches[0].clientX, touches[0].clientY);
                target.dispatchEvent(
                    new TouchEvent("touchstart", {
                      view: window,
                      bubbles: true,
                      cancelable: true
                    })
                  );
            }}
            onClick={e => props.onClick ? props.onClick(e) : null}/>
}

function PcbHtmlAnnotation(props) {
    return <div className="w-max absolute"
                style={{"left": props.mapX(props.pos[0]), "top": props.mapY(props.pos[1])}}>
                    {props.content}
            </div>;
}

function ComponentHighligh(props) {
    let c = props.component;
    let shape = bboxToPoly(c.bbox);
    let polySpec = shape
        .map(p => props.transform(p))
        .map(p => `${p[0]},${p[1]}`).join(" ");
    return <>
        <polygon
            points={polySpec}
            fill="none"
            strokeWidth="1"
            stroke="rgba(255, 255, 255, 200)"
            style={{
                filter: "url(#sharpBlur)"
            }}/>
        <polygon
            points={polySpec}
            fill="none"
            strokeWidth="0.8"
            stroke={props.color}
            style={{
                filter: "url(#sharpBlur)",
                "transformOrigin": "center"
            }}/>
        <polygon
            points={polySpec}
            fill="none"
            strokeWidth="0.3"
            stroke="rgba(0, 0, 0, 0.3)"/>
    </>
}

function PinHighlight(props) {
    let pin = props.pin;
    let shape = pin.shape;
    let polySpec = shape
        .map(p => props.transform(p))
        .map(p => `${p[0]},${p[1]}`).join(" ");
    return <>
        <polygon
            points={polySpec}
            fill="none"
            strokeWidth="1"
            stroke="rgba(255, 255, 255, 200)"
            style={{
                filter: "url(#sharpBlur)"
            }}/>
        <polygon
            points={polySpec}
            fill="none"
            strokeWidth="0.8"
            stroke={props.color}
            style={{
                filter: "url(#sharpBlur)",
                "transformOrigin": "center"
            }}/>
        <polygon
            points={polySpec}
            fill="none"
            strokeWidth="0.3"
            stroke="rgba(0, 0, 0, 0.3)"/>
    </>
}


function GroupSelector(props) {
    let [expanded, setExpanded] = useState({});

    let handleExpand = (id, state) => {
        setExpanded({
            ...expanded,
            ...{[id]: state}});
    };

    let genTree = (group) => {
        return Object.keys(group).map(groupName => {
            return {
                "id": groupName,
                "label": <div className="inline-block p-1 ml-1 cursor-pointer">{groupName}</div>,
                "checked": props.visible[groupName] || false,
                "expanded": expanded[groupName] || false,
                "children": genTree(group[groupName])
            }
        });
    }
    return <div>
        <h1 className="text-xl">
            Highlight groups:
        </h1>
        <FlatRootCheckbox
            roots={genTree(props.groups)}
            onCheck={props.onVisible}
            onExpand={handleExpand}
            sideBySide={props.sideBySide}/>
    </div>
}

function PinDescription(props) {
    if (props.pin === null)
        return null;
    let pin = props.pin;
    let description = pin.description;
    if (pin.alias && props.allPins) {
        let candidates = props.allPins.filter(p => !p.alias && pin.alias === p.name );
        if (candidates.length > 0)
            description = candidates[0].description;
    }
    return <>
        <h1 className="text-2xl font-semibold">
            <div className="inline-block rounded-full mr-1"
                 style={{
                    width: "1em",
                    height: "1em",
                    backgroundColor: props.color
                 }}>
            </div>
            {pin.name}
        </h1>
        <p className="py-1 mb-2 border-gray-300 border-b-2">
            Member of groups: {pin.groups.join(", ")}
        </p>
        <ReactMarkdown>{description}</ReactMarkdown>
    </>
}

function ComponentDescription(props) {
    if (props.component === null)
        return null;
    let c = props.component;
    return <>
        <h1 className="text-2xl font-semibold">
            Component {c.ref}
        </h1>
        <p className="py-1 mb-2 border-gray-300 border-b-2">
            Member of groups: {c.groups.join(", ")}
        </p>
        <ReactMarkdown>{c.description}</ReactMarkdown>
    </>
}

function PinTooltip(props) {
    return <div className="tight-shadow">
        <div className="bg-gray-300 absolute rounded"
             style={{
                width: "3px",
                height: "30px",
                transform: "rotate(-60deg)",
                top: -8,
                left: 10
            }}/>
        <div className="absolute w-max p-2 bg-black text-white rounded border-gray-300 border-2"
             style={{
                 top: 10,
                 left: 18
             }}>
            {props.pin.name}
        </div>
    </div>;
}

function Help(props) {
    const [expanded, setExpanded] = useState(false);

    return <div {...props}>
        <button className="p-2" onClick={() => setExpanded(!expanded)}>
            <svg width="1.5em" height="1.5em" viewBox="0 0 50 50" className="inline-block">
                <circle cx="25" cy="25" r="20" fill="#2590EB" />
                <text x="50%" y="50%" textAnchor="middle" fill="white" fontSize="20px" fontFamily="Verdana" dy=".3em">?</text>
                ?
            </svg>
            How to use this diagram?
        </button>
        {
            !expanded ? null :
            <div className="p-4 text-left text-base border-gray-100 border-2 shadow rounded">
                <p>
                    The diagram is divided into three columns/sections:
                </p>
                <ul>
                    <li>The first sections allows to highlight group of pins. You
                        can use the arrow next to the group to expand it and
                        see the nested groups.
                    </li>
                    <li>The middle sections shows you the PCB. You can hover
                        with your mouse over the pins and component or click on them.
                    </li>
                    <li>The last section shows you detailed description of the pin.
                    </li>
                </ul>
                <p>By default a pin or component description is shown if you
                    hover with mouse over it. You can also see the description
                    in the last section. If you want, you can pin the pins or
                    components by clicking them. You can unpin them by clicking
                    on them again. The colors of the pinned components cycle, so
                    you can easily distinguish the pins. This is useful when
                    you actually make connections on the real board based
                    on the diagram.</p>

                <button className="w-full rounded p-3 my-1 shadow bg-blue-400"
                    onClick={() => setExpanded(false)}>
                    OK, got it!
                </button>
            </div>
        }
    </div>;
}

function useDimensionsTrivial() {
    return useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            unobserve();
            observe();
        },
    });
}

function PinionLayout(props) {
    const { observe: containerRef, height: containerHeight } = useDimensionsTrivial();
    const { observe: headerRef, height: headerHeight } = useDimensionsTrivial();

    let { head, children, footer, fit, ...others } = props;
    let contentHeight = fit ? containerHeight - headerHeight : "auto"

    return <div ref={containerRef} className="w-full h-full relative top-0 left-0 " {...others}>
        <div ref={headerRef} className="w-full overflow-auto">
            { head }
        </div>
        <div className="w-full"
             style={{height: contentHeight}}>
            { children }
        </div>
        <div className="w-full absolute bottom-0 right-0 z-min">
            { footer }
        </div>
    </div>
}

function PinionHeader(props) {
    let spec = props.spec;
    return <>
        <div className="flex flex-wrap">
            <h1 className="w-max text-2xl font-semibold flex-initial">
                {spec.name}
            </h1>
            <Help
                className="w-max align-middle text-xs flex-1 text-right"
                style={{minWidth: "200px"}}/>
        </div>
        <ReactMarkdown>{spec.description}</ReactMarkdown>
    </>;
}

function PinionFooter(props) {
    return <div className="w-full my-4 px-4 text-xs text-gray-600 text-sm text-right">
        Diagram proudly generated by&nbsp;
        <a  className="text-blue-500 hover:text-blue-800 border-b-2"
            href="https://github.com/yaqwsx/Pinion">
                Pinion
        </a>
    </div>
}

function chooseColor(palette, assignedColors) {
    let occurences = _.countBy(assignedColors);
    let least = _.min(Object.values(occurences));
    let color = _.find(palette, c => occurences[c] === undefined);
    if (color !== undefined)
        return color
    return _.find(palette, c => occurences[c] === least);
}

export function PinionWidget(props) {
    const [spec, setSpec] = useState(null);
    const [error, setError] = useState(null);
    const [visibleGroups, setVisibleGroups] = useState({});
    const [activePin, setActivePin] = useState(null)
    const [activeComponent, setActiveComponent] = useState(null);
    const [pinnedPins, setPinnedPins] = useState(new Map()) // Mapping from pin to colors
    const [pinnedComponent, setPinnedComponent] = useState(null);
    const [frontActive, setFrontActive] = useState(true);
    const [maximized, setMaximized] = useState(false);
    const { observe, width } = useDimensionsTrivial();

    useEffect(() => {
        fetchJson(props.source + "/spec.json")
            .then(setSpec)
            .catch(e => {
                console.log(e);
                setError(e.message + ": " + e.toString());
            });
    }, [props.source]);

    if (error)
        return <div class="errorMessage">{error}</div>;
    if (!spec)
        return <div className="pinionWidget">
            <GridLoader size={20} css={loaderCss}/>
        </div>

    let handlePinLeave = pin => {
        if (activePin === pin)
            setActivePin(null)
    };

    let handleComponentLeave = c => {
        if (activeComponent === c)
            setActiveComponent(null)
    }

    let handlePinClick = pin => {
        let newPins = new Map(pinnedPins);
        if (pinnedPins.get(pin))
            newPins.delete(pin);
        else
            newPins.set(pin, chooseColor(palette, Array.from(newPins.values())));
        setPinnedPins(newPins);
    }

    let handleComponentClick = c => {
        // setPinnedPin(null);
        setPinnedComponent(c);
    };
    let handleMisClick = () => {
        // setPinnedPins({});
        setPinnedComponent(null);
    }

    let handleGroupVisibility = (groups, state) => {
        // We cannot use Object.fromEntries as Qutebrowser does not support it
        let change = {};
        groups.forEach(element => {
            change[element] = state;
        });
        setVisibleGroups({
            ...visibleGroups,
            ...change});
    }

    let palette = ["#FFA200", "#8ac926", "#1982c4", "#3644FF", "#FF80F2"];

    let side = frontActive ? spec.front : spec.back;
    let sideTransform = frontActive
        ? x => x
        : x => [-x[0], x[1]];

    let isItemVisible = item => (frontActive && item.front) || (!frontActive && item.back);

    let allPins = spec.components.flatMap(x => x.pins).filter(x => isItemVisible(x));
    let allComponents = spec.components.filter(x => x.highlight).filter(x => isItemVisible(x));

    let highlightedPins = allPins
        .filter(pin => pin.groups.some(group => visibleGroups[group]));
    let highlightedComponents = allComponents
        .filter(c => c.groups.some(group => visibleGroups[group]))

    let activePins = allPins
        .filter(pin => activePin && pin.name === activePin.name );

    let selectedComponent = activeComponent === null ? pinnedComponent : activeComponent;
    let activeComponents = allComponents
        .filter(c => selectedComponent && c.ref === selectedComponent.ref );

    // As we are are inside an unknown container, we cannot use media query.
    // Therefore, we implement layout change in JS instead
    let treeClass = "w-auto", treeStyle = {}, treeSideBySide = false;
    let pcbClass = "", pcbStyle = {};
    let labelClass = "", labelStyle = {minWidth: "300px", maxWidth: "450px"};
    if (width < 1100) {
        treeClass = "w-full";
        treeSideBySide = true;
        pcbClass = "w-full mx-auto";
        pcbStyle = { maxWidth: "800px" };
        // We add the border so the user is aware that there is a container
        labelClass = "w-full border-gray-600 border-l-2";
        labelStyle = {minHeight: "300px"};
    }

    return <div ref={observe} className={"w-full p-4 font-sans " +
                                         (maximized ? "bg-white fixed inset-0 z-max" : "")}>
        <PinionLayout
                fit={maximized}
                head={<PinionHeader spec={spec}/>}
                footer={<PinionFooter/>}>
            <div className="w-full flex flex-wrap my-4 h-full">
                <div className={"px-4 py-4 flex-none max-h-full " + treeClass} style={treeStyle}>
                    <GroupSelector
                        groups={spec.groups}
                        visible={visibleGroups}
                        onVisible={handleGroupVisibility}
                        sideBySide={treeSideBySide}/>
                </div>
                <div className={"flex-1 px-4 max-h-full " + pcbClass}
                    style={pcbStyle}
                    onClick={handleMisClick}>
                    <PcbMap className="mx-auto max-h-full py-4"
                            src={props.source + "/" + side.file}
                            area={side.area}
                            transform={sideTransform}
                            htmlAnnotations={
                                !activePin ? [] :
                                    [{
                                        "pos": activePin.pos,
                                        "content": <PinTooltip pin={activePin}/>
                                    }]
                            }
                            hotspots={
                                [].concat(
                                    allComponents.map(c => { return {
                                        "shape": bboxToPoly(c.bbox),
                                        "onHoverStart": () => setActiveComponent(c),
                                        "onHoverEnd": () => handleComponentLeave(c),
                                        "onClick": e => {e.stopPropagation(); handleComponentClick(c)}
                                    }}),
                                    allPins.map(pin => { return {
                                        "shape": pin.shape,
                                        "onHoverStart": () => setActivePin(pin),
                                        "onHoverEnd": () => handlePinLeave(pin),
                                        "onClick": e => {e.stopPropagation(); handlePinClick(pin)}
                                    }})
                                )

                            }
                            svgAnnotations={
                                [].concat(
                                    [
                                        <defs key="f1">
                                            <filter id='sharpBlur' x="-500%" y="-500%" width="1000%" height="1000%">
                                                <feGaussianBlur stdDeviation='0.3' in="SourceGraphic"/>
                                            </filter>
                                        </defs>
                                    ],
                                    highlightedPins.map((pin, i) =>
                                        <PinHighlight key={`ph${i}`}
                                                    pin={pin}
                                                    transform={sideTransform}
                                                    color="#FCD34D"/>
                                    ),
                                    activePins.map((pin, i) =>
                                        <PinHighlight key={`pa${i}`}
                                                    pin={pin}
                                                    transform={sideTransform}
                                                    color="#DC2626"/>
                                    ),
                                    Array.from(pinnedPins.entries()).map(([pin, color], i) =>
                                        <PinHighlight key={`pi${i}`}
                                                    pin={pin}
                                                    transform={sideTransform}
                                                    color={color}/>
                                    ),
                                    highlightedComponents.map((c, i) =>
                                        <ComponentHighligh key={`ch${i}`}
                                                        component={c}
                                                        transform={sideTransform}
                                                        color="#3B82F6"/>
                                    ),
                                    activeComponents.map((c, i) =>
                                        <ComponentHighligh key={`ca${i}`}
                                                        component={c}
                                                        transform={sideTransform}
                                                        color="#7C3AED"/>
                                    )
                                )
                            }
                        />
                </div>
                <div className={"px-2 py-4 flex-auto max-h-full " + labelClass} style={labelStyle}>
                    <button className="w-full rounded p-3 mb-2 shadow bg-blue-400"
                            onClick={() => setMaximized(!maximized)}>
                        { maximized ? "Minimize" : "Maximize" }
                    </button>
                    <div className="w-full flex mb-4">
                        <button className={"flex-1 mr-1 rounded p-3 shadow " + (frontActive ? "bg-blue-400" : "bg-blue-200")}
                                onClick={() => setFrontActive(true)}>
                            Front side
                        </button>
                        <button className={"flex-1 mr-1 rounded p-3 shadow " + (!frontActive ? "bg-blue-400" : "bg-blue-200")}
                                onClick={() => setFrontActive(false)}>
                            Back side
                        </button>
                    </div>
                    <ComponentDescription component={selectedComponent}/>
                    <PinDescription pin={activePin} allPins={allPins} color="#DC2626"/>
                    {
                        Array.from(pinnedPins.entries()).map(([pin, color], i) =>
                            <PinDescription key={i} color={color} pin={pin} allPins={allPins}/>
                        )
                    }
                </div>
            </div>
        </PinionLayout>
    </div>
}

