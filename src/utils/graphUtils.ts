import { Edge, Node } from '../types';

export function getNeighbors(nodeId: string, edges: Edge[]): string[] {
  const neighbors: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId) {
      neighbors.push(edge.target);
    } else if (edge.target === nodeId) {
      neighbors.push(edge.source);
    }
  }
  return neighbors;
}

export function findViolations(
  edges: Edge[],
  nodeColors: Record<string, string>
): string[] {
  const violations: string[] = [];

  for (const edge of edges) {
    const color1 = nodeColors[edge.source];
    const color2 = nodeColors[edge.target];

    if (color1 && color2 && color1 === color2) {
      violations.push(edge.id);
    }
  }

  return violations;
}

export function isLevelComplete(
  nodes: Node[],
  nodeColors: Record<string, string>
): boolean {
  return nodes.every((node) => nodeColors[node.id] !== undefined);
}

export function hasNoViolations(
  edges: Edge[],
  nodeColors: Record<string, string>
): boolean {
  return findViolations(edges, nodeColors).length === 0;
}
