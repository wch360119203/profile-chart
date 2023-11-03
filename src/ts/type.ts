export type dataInputT = (linkDataInputT | nodeDataInputT)[]
export type linkDataInputT = {
  id: number
  distance: number
  pipeLength: number
  begNodeBottom: number
  endNodeBottom: number
  begOffset: number | null
  endOffset: number | null
  sectionWidth: number | null
  elementType: 'LINK'
}
export type nodeDataInputT = {
  id: number
  wellDepth: number
  wellBottomAlti: number
  otherLinkInfo: NodeLinkRelationInfo[]
  inLinkInfo: NodeLinkRelationInfo | null
  outLinkInfo: NodeLinkRelationInfo | null
  distance: number
  elementType: 'NODE'
}
type NodeLinkRelationInfo = { offset: number | null; sectionWidth: number | null }
