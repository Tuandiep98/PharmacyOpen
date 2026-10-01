import type { Grade } from "@pharmacy/simulation";
import type { ReactNode } from "react";
import { ART, INK } from "./palette";

type Props = { defId: string; grade: Grade; finish: number };
const edge = {
  stroke: INK,
  strokeWidth: 1.8,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};
const tier: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 };

export function TieredStoreArt({ defId, grade, finish }: Props): ReactNode {
  const rank = tier[grade];
  switch (defId) {
    case "money-plant": {
      const leaves = (
        [
          [-7, -18],
          [7, -23],
          [-8, -27],
          [8, -31],
          [-4, -33],
          [5, -17],
          [-9, -33],
          [9, -33],
        ] as [number, number][]
      ).slice(0, [2, 4, 6, 8][rank]);
      return (
        <g className="tier-money-plant">
          <path
            d="M-9,-11 L9,-11 L7,0 H-7Z"
            fill={rank === 0 ? "#C8BAA4" : rank === 3 ? "#F1E5C8" : ART.paper}
            {...edge}
          />
          <ellipse cx={0} cy={-11} rx={9} ry={2.5} fill="#8C7155" {...edge} />
          <g className="money-foliage">
            <path
              d="M0,-12 V-34 M0,-18 L-7,-27 M0,-24 L8,-31"
              fill="none"
              stroke="#4D7B5B"
              strokeWidth={1.7}
              strokeLinecap="round"
            />
            {leaves.map(([x, y], i) => (
              <ellipse
                key={i}
                cx={x}
                cy={y}
                rx={rank === 0 ? 3.3 : 4.3}
                ry={rank === 0 ? 2.5 : 3.2}
                transform={`rotate(${x < 0 ? -27 : 27} ${x} ${y})`}
                fill={i % 2 ? "#63A676" : "#8BC994"}
                {...edge}
              />
            ))}
            {rank >= 2 && (
              <path
                d="M-10,-29 l-2,-2 M9,-34 l2,-2"
                stroke="#BCE6B1"
                strokeWidth={1}
              />
            )}
          </g>
          <path
            d="M-9,-11 Q0,-8 9,-11"
            fill="none"
            stroke={INK}
            strokeWidth={1.5}
          />
          {rank >= 1 && (
            <path d="M-6,-6 h12" stroke="#D8C9A5" strokeWidth={1.1} />
          )}
          {rank >= 2 && (
            <path
              d="M-3,-4 Q0,-7 3,-4"
              fill="none"
              stroke={ART.honey}
              strokeWidth={1.3}
            />
          )}
          {rank === 3 && <circle cx={0} cy={-4} r={1.1} fill={ART.honey} />}
        </g>
      );
    }
    case "notice-board": {
      const notes = [
        [-11, -25, "#FFF7E9"],
        [1, -26, "#F9E8B3"],
        [-10, -15, "#DDF0E3"],
        [2, -16, "#F6D7CD"],
      ].slice(0, [1, 2, 3, 4][rank]);
      return (
        <g className="tier-notice-board">
          <path
            d="M-16,-31 H16 V-6 H-16Z"
            fill={rank === 0 ? "#AC8665" : "#C89D6B"}
            {...edge}
          />
          <path
            d="M-13,-28 H13 V-9 H-13Z"
            fill={rank === 0 ? "#D2B58E" : "#E5C89D"}
            stroke={INK}
            strokeWidth={1}
          />
          <g className="board-notes">
            {notes.map(([x, y, color], i) => (
              <g key={i}>
                <rect
                  x={x as number}
                  y={y as number}
                  width={rank === 0 ? 10 : 9}
                  height={rank === 0 ? 9 : 8}
                  rx={0.7}
                  fill={color as string}
                  stroke={INK}
                  strokeWidth={0.75}
                />
                <circle
                  cx={(x as number) + 4.5}
                  cy={(y as number) + 0.7}
                  r={1.1}
                  fill={i % 2 ? ART.leaf : ART.coral}
                />
                {rank >= 2 && (
                  <path
                    d={`M${(x as number) + 2},${(y as number) + 4} h5 M${(x as number) + 2},${(y as number) + 6} h3`}
                    stroke="#B8AF9D"
                    strokeWidth={0.6}
                  />
                )}
              </g>
            ))}
          </g>
          {rank >= 1 && (
            <path d="M-12,-29 h24" stroke="#F2D7AA" strokeWidth={1} />
          )}
          {rank >= 2 && (
            <path
              d="M-14,-31 h28 M-14,-6 h28"
              stroke="#8A6245"
              strokeWidth={1.2}
            />
          )}
          {rank === 3 && (
            <path d="M-4,-32 l4,-3 4,3" fill="#E7B96D" {...edge} />
          )}
          <path d="M-10,-6 v5 M10,-6 v5" {...edge} />
        </g>
      );
    }
    case "paper-lantern":
      return (
        <g className="tier-lantern">
          {rank === 3 && (
            <ellipse
              className="lantern-glow"
              cx={0}
              cy={-19}
              rx={15}
              ry={16}
              fill="#F7D17B"
              opacity={0.2}
            />
          )}
          <path d="M0,-38 v5" {...edge} />
          <rect
            x={-6}
            y={-34}
            width={12}
            height={4}
            rx={1}
            fill={rank === 0 ? "#A89272" : ART.honey}
            {...edge}
          />
          <g className="lantern-paper">
            <ellipse
              cx={0}
              cy={-19}
              rx={rank === 0 ? 9 : 11}
              ry={rank === 0 ? 10 : 12}
              fill={rank === 0 ? "#B98476" : rank === 3 ? "#E57758" : ART.coral}
              {...edge}
            />
            {rank >= 1 && (
              <path
                d="M-5,-29 Q-9,-19 -5,-9 M5,-29 Q9,-19 5,-9"
                fill="none"
                stroke="#F6B897"
                strokeWidth={1.2}
              />
            )}
            {rank >= 2 && (
              <path
                d="M-9,-19 H9 M0,-31 V-7"
                fill="none"
                stroke="#F7C791"
                strokeWidth={1.2}
              />
            )}
            {rank === 3 && (
              <path
                d="M-3,-24 Q0,-27 3,-24 M-3,-14 Q0,-11 3,-14"
                fill="none"
                stroke="#FFE5B1"
                strokeWidth={1.1}
              />
            )}
          </g>
          <rect
            x={-6}
            y={-8}
            width={12}
            height={4}
            rx={1}
            fill={rank === 0 ? "#A89272" : ART.honey}
            {...edge}
          />
          <path
            className="lantern-tassel"
            d={rank === 0 ? "M0,-4 V0" : "M0,-4 V2 M-2,-1 V1 M2,-1 V1"}
            fill="none"
            stroke={rank === 0 ? "#9D8269" : ART.honey}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>
      );
    case "disco-lights": {
      const bulbs = [
        [-14, -29, "#E77478"],
        [-7, -25, "#F1C66A"],
        [0, -23, "#88C5D7"],
        [7, -25, "#A7D383"],
        [14, -29, "#D8A7D8"],
        [-11, -10, "#88C5D7"],
        [0, -7, "#E77478"],
        [11, -10, "#F1C66A"],
      ].slice(0, [3, 5, 7, 8][rank]);
      return (
        <g className="tier-disco-lights">
          <path
            d="M-17,-31 Q0,-20 17,-31"
            fill="none"
            stroke={INK}
            strokeWidth={1.5}
          />
          {rank >= 2 && (
            <path
              d="M-17,-11 Q0,0 17,-11"
              fill="none"
              stroke={INK}
              strokeWidth={1.5}
            />
          )}
          {bulbs.map(([x, y, color], i) => (
            <g key={i} className="light-bulb">
              {rank === 3 && (
                <circle
                  className="bulb-halo"
                  cx={x as number}
                  cy={(y as number) + 3}
                  r={5}
                  fill={color as string}
                  opacity={0.28}
                />
              )}
              <rect
                x={(x as number) - 1.6}
                y={y as number}
                width={3.2}
                height={2.3}
                rx={0.5}
                fill="#5D7668"
              />
              <ellipse
                cx={x as number}
                cy={(y as number) + 4.1}
                rx={2.3}
                ry={3.4}
                fill={rank === 0 ? "#A5A8A0" : (color as string)}
                stroke={INK}
                strokeWidth={0.9}
              />
            </g>
          ))}
          {rank >= 1 && <circle cx={-17} cy={-31} r={1.2} fill={ART.wood} />}
          {rank === 3 && (
            <path
              d="M-16,-33 l1,-2 M15,-33 l-1,-2"
              stroke="#EBC875"
              strokeWidth={1}
            />
          )}
        </g>
      );
    }
    case "candy-speaker":
      return (
        <g className="tier-candy-speaker">
          <rect
            x={-11}
            y={-32}
            width={22}
            height={32}
            rx={rank === 0 ? 2 : 4}
            fill={rank === 0 ? "#AA7D80" : rank === 3 ? "#E779A3" : "#D87997"}
            {...edge}
          />
          {rank >= 1 && (
            <rect
              x={-8}
              y={-29}
              width={16}
              height={25}
              rx={2}
              fill="none"
              stroke="#F5AFC5"
              strokeWidth={1}
            />
          )}
          <g className="speaker-cone">
            <circle
              cx={0}
              cy={-11}
              r={rank === 0 ? 5.7 : 7}
              fill="#39434B"
              {...edge}
            />
            <circle
              cx={0}
              cy={-11}
              r={rank === 0 ? 2 : 3}
              fill={rank === 3 ? ART.honey : "#87939A"}
            />
          </g>
          {rank >= 1 && (
            <circle cx={0} cy={-25} r={3.4} fill="#39434B" {...edge} />
          )}
          {rank >= 2 && (
            <path
              d="M-7,-29 h14 M-7,-4 h14"
              stroke="#F5C5D3"
              strokeWidth={1.1}
            />
          )}
          {rank === 3 && (
            <>
              <circle cx={0} cy={-25} r={1.1} fill="#F9D47C" />
              <path
                className="speaker-sound"
                d="M14,-21 Q18,-16 14,-11 M17,-25 Q23,-16 17,-7"
                fill="none"
                stroke={ART.honey}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </>
          )}
          {rank === 0 && (
            <path d="M-8,-3 h3" stroke="#785D61" strokeWidth={1} />
          )}
          {finish >= 3 && (
            <path d="M-8,-25 h2" stroke="#FFF2D7" strokeWidth={0.9} />
          )}
        </g>
      );
    default:
      return null;
  }
}
