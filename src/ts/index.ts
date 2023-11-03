import type { dataInputT } from './type'
import { zoom, type BaseType, type Selection } from 'd3'
import { v4 as uuidV4 } from 'uuid'
type rootSvgT = Selection<SVGSVGElement, any, BaseType, any>
export function createClipPath(
  rootSvg: rootSvgT,
  padding: { left: number; top: number; right: number; bottom: number },
  size: { width: number; height: number }
) {
  const clipPathId = uuidV4()
  const clipPath = rootSvg.append('defs').append('clipPath')
  clipPath
    .attr('id', clipPathId)
    .append('rect')
    .attr('x', padding.left)
    .attr('y', padding.top)
    .attr('width', size.width - padding.left - padding.right)
    .attr('height', size.height - padding.top - padding.bottom)
  return clipPathId
}
export function initDataG(clipPathId: string, rootSvg: rootSvgT) {
  const dataG = rootSvg.append('g')
  dataG.attr('clip-path', `url(#${clipPathId})`)
  const earthPath = dataG.append('path').attr('class', 'earth')
  const allLinkG = dataG.append('g').attr('class', 'all-link-g')
  const allNodeG = dataG.append('g').attr('class', 'all-node-g')
  return { dataG, allNodeG, allLinkG, earthPath }
}
export function initZoomHandle(rootSvg: rootSvgT, container: HTMLDivElement) {
  const zoomHandle = zoom<SVGSVGElement, undefined>()
    .filter((event) => (!event.ctrlKey || event.type === 'wheel') && !event.button)
    .scaleExtent([1, Infinity])
    .translateExtent([
      [0, -Infinity],
      [container.clientWidth, Infinity]
    ])
  rootSvg.call(zoomHandle)
  return zoomHandle
}
/**校验输入数据 */
export function verifyDataInput(data: dataInputT) {
  if (data.length == 0) throw new Error('输入数据为空')
  for (let i = 0; i < data.length; i++) {
    const element = data[i]
    if (element.elementType !== (i % 2 == 0 ? 'NODE' : 'LINK'))
      throw new Error('elementType校验未通过')
  }
}
/**获取y轴最高和最低的点 */
export function getMaxminY(data: dataInputT) {
  let max = -Infinity,
    min = Infinity
  data.forEach((el) => {
    if (el.elementType == 'LINK') return
    if (el.wellBottomAlti != null) min = Math.min(min, el.wellBottomAlti)
    if (el.wellBottomAlti != null && el.wellDepth != null)
      max = Math.max(max, el.wellBottomAlti + el.wellDepth)
  })
  return { max, min }
}
