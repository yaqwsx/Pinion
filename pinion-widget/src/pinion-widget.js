import {useState, useEffect} from "react";
import useDimensions from "react-cool-dimensions";
import GridLoader from "react-spinners/GridLoader";
import { css } from "@emotion/react";
import ReactMarkdown from 'react-markdown'
import './pinion-widget.css';
import {FlatRootCheckbox} from "./checkbox-tree"

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

function PcbMap(props) {
    const { observe, width, height } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            unobserve();
            observe();
        },
    });

    let {area, src, transform, hotspots, className,
         htmlAnnotations, svgAnnotations, ...others} = props;

    let mapX = x => (transform([x, 0])[0] - area.tl[0]) / (area.br[0] - area.tl[0]) * width;
    let mapY = y => (transform([0, y])[1] - area.tl[1]) / (area.br[1] - area.tl[1]) * height;

    return <div className={"max-w-full relative top-0 left-0 " + className} {...others}>
        <img src={src}
                alt="PCB Preview"
                className="tight-shadow"
                ref={observe}/>
        {/* SVG for drawing annotations */}
        <svg className="absolute top-0 left-0 w-full h-full"
            viewBox={`${area.tl[0]} ${area.tl[1]} ${area.br[0] - area.tl[0]} ${area.br[1] - area.tl[1]}`}>
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
        <svg className="absolute top-0 left-0 w-full h-full"
            viewBox={`${area.tl[0]} ${area.tl[1]} ${area.br[0] - area.tl[0]} ${area.br[1] - area.tl[1]}`}>
        {
            hotspots.map((spot, idx) => {
                return <PcbHotSpot  key={idx}
                                    shape={spot.shape}
                                    transform={transform}
                                    onMouseEnter={spot.onMouseEnter}
                                    onMouseLeave={spot.onMouseLeave}
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
            onMouseEnter={e => props.onMouseEnter ? props.onMouseEnter(e) : null}
            onMouseLeave={e => props.onMouseLeave ? props.onMouseLeave(e) : null}
            onClick={e => props.onClick ? props.onClick(e) : null}/>
}

function PcbHtmlAnnotation(props) {
    return <div className="w-max absolute"
                style={{"left": props.mapX(props.pos[0]), "top": props.mapY(props.pos[1])}}>
                    {props.content}
            </div>;
}

function PinHighlight(props) {
    let pin = props.pin;
    let shape = pin.shape;
    let pos = props.transform(pin.pos);
    let polySpec = shape
        .map(p => props.transform(p))
        .map(p => `${p[0]},${p[1]}`).join(" ");
    return <>
        <g transform={`translate(${pos[0]}, ${pos[1]})`}>
            <g transform={`translate(${-pos[0]}, ${-pos[1]})`}>
                <polygon
                    points={polySpec}
                    fill="none"
                    strokeWidth="1"
                    stroke="rgba(255, 255, 255, 200)"
                    style={{
                        filter: "url(#sharpBlur)"
                    }}/>
            </g>
            <animateTransform attributeName="transform"
                additive="sum"
                type="scale"
                values="0.8; 1; 0.8"
                begin="0s"
                dur="4s"
                repeatCount="indefinite"/>
        </g>
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
            onExpand={handleExpand}/>
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
        <h1 className="text-xl">
            {pin.name}
        </h1>
        <p>
            Member of groups: {pin.groups.join(", ")}
        </p>
        <ReactMarkdown>{description}</ReactMarkdown>
    </>
}

export function PinionWidget(props) {
    const [spec, setSpec] = useState(null);
    const [error, setError] = useState(null);
    const [visibleGroups, setVisibleGroups] = useState({});
    const [activePin, setActivePin] = useState(null)
    const [pinnedPin, setPinnedPin] = useState(null)
    const [frontActive, setFrontActive] = useState(true);

    useEffect(() => {
        fetchJson(props.source + "/spec.json")
            .then(setSpec)
            .catch(e => {
                setError(e.message);
            });
    }, [props.source]);

    if (error)
        return <div class="errorMessage">{error}</div>;
    if (!spec)
        return <div className="pinionWidget">
            <GridLoader size={20} css={loaderCss}/>
        </div>

    let handlePinEnter = pin => {
        setActivePin(pin);
    };
    let handlePinLeave = pin => {
        if (activePin === pin)
            setActivePin(null)
    };
    let handlePinClick = pin => {
        setPinnedPin(pin);
    }
    let handleMisClick = () => {
        setPinnedPin(null);
    }

    let handleGroupVisibility = (groups, state) => {
        setVisibleGroups({
            ...visibleGroups,
            ...Object.fromEntries(groups.map(x => [x, state]))});
    }

    let side = frontActive ? spec.front : spec.back;
    let sideTransform = frontActive
        ? x => x
        : x => [-x[0], x[1]];

    let isPinVisible = pin => (frontActive && pin.front) || (!frontActive && pin.back);

    let allPins = spec.components.flatMap(x => x.pins).filter(x => isPinVisible(x));
    let highlightedPins = allPins.filter(pin => pin.groups.some(group => visibleGroups[group]));

    let selectedPin = activePin === null ? pinnedPin : activePin;
    let activePins = allPins.filter(pin => selectedPin && pin.name === selectedPin.name );


    return <div className="w-full p-4">
        <h1 className="text-2xl font-semibold">
            {spec.name}
        </h1>
        <p>{spec.description}</p>
        <div className="w-full flex flex-wrap my-4">
            <div className="w-full my-4 md:w-auto px-4 flex-none">
                <GroupSelector
                    groups={spec.groups}
                    visible={visibleGroups}
                    onVisible={handleGroupVisibility}/>
            </div>
            <div className="w-full my-4 lg:w-auto flex-1 px-4 min-w-1/2"
                 onClick={handleMisClick}>
                <PcbMap className="mx-auto"
                        src={props.source + "/" + side.file}
                        area={side.area}
                        transform={sideTransform}
                        htmlAnnotations={
                            !activePin ? [] :
                                [{
                                    "pos": activePin.pos,
                                    "content": <div className="w-max p-2 bg-black text-white rounded">
                                                {activePin.name}
                                            </div>
                                }]
                        }
                        hotspots={
                            allPins.map(pin => { return {
                                "shape": pin.shape,
                                "onMouseEnter": () => handlePinEnter(pin),
                                "onMouseLeave": () => handlePinLeave(pin),
                                "onClick": e => {e.stopPropagation(); handlePinClick(pin)}
                            }})
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
                                    <PinHighlight key={`h${i}`}
                                                  pin={pin}
                                                  transform={sideTransform}
                                                  color="#FCD34D"/>
                                ),
                                activePins.map((pin, i) =>
                                    <PinHighlight key={`a${i}`}
                                                  pin={pin}
                                                  transform={sideTransform}
                                                  color="#DC2626"/>
                                )
                            )
                        }
                    />
            </div>
            <div className="w-full my-4 lg:w-96 flex-none">
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
                <PinDescription pin={selectedPin} allPins={allPins}/>
            </div>
        </div>
        <div className="w-full my-4 text-xs text-gray-600 text-sm text-right">
                Diagram proudly generated by&nbsp;
                <a  className="text-blue-500 hover:text-blue-800 border-b-2"
                    href="https://github.com/yaqwsx/Pinion">
                        Pinion
                </a>
        </div>
    </div>
}

