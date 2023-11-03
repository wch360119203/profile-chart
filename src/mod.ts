import {
  ZoomTransform,
  axisBottom,
  axisLeft,
  create,
  scaleLinear,
  type EnterElement,
  type Selection
} from 'd3'
import { defaultsDeep } from 'lodash-es'
import { createClipPath, getMaxminY, initDataG, initZoomHandle, verifyDataInput } from './ts'
import { type dataInputT, type linkDataInputT, type nodeDataInputT } from './ts/type'
import { defaultConfig } from './ts/defaultConfig'
import { Observer } from '@wuch96/utils'
export class ProfileChart {
  rootSvg = create('svg')
  xScale = scaleLinear()
  yScale = scaleLinear()
  container
  config: typeof defaultConfig
  xAxisG
  yAxisG
  dataG
  allLinkG
  allNodeG
  earthPath
  observer = new Observer<{
    scale(transform: ZoomTransform): void
  }>()
  transform?: ZoomTransform
  constructor(dom: HTMLDivElement, cfg?: typeof defaultConfig) {
    this.container = dom
    this.config = defaultsDeep(cfg, defaultConfig)

    const rootNode = this.rootSvg.node()
    rootNode && dom.appendChild(rootNode)
    // 设置边框
    this.rootSvg
      .attr('width', dom.clientWidth)
      .attr('height', dom.clientHeight)
      .attr('viewBox', [0, 0, dom.clientWidth, dom.clientHeight])
    this.xAxisG = this.rootSvg
      .append('g')
      .attr('color', 'white')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${dom.clientHeight - this.config.padding.bottom})`)
    this.yAxisG = this.rootSvg
      .append('g')
      .attr('color', 'white')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${this.config.padding.left},0)`)
    const clipPathId = createClipPath(this.rootSvg, this.config.padding, {
      width: dom.clientWidth,
      height: dom.clientHeight
    })
    const { dataG, allLinkG, allNodeG, earthPath } = initDataG(clipPathId, this.rootSvg)
    earthPath.attr('fill', this.config.bgColor)
    this.dataG = dataG
    this.allLinkG = allLinkG
    this.allNodeG = allNodeG
    this.earthPath = earthPath
    const zoomHandle = initZoomHandle(this.rootSvg, dom)
    zoomHandle.on('zoom', ({ transform }: { transform: ZoomTransform }) => {
      this.transform = transform
      this.allNodeG.call((e) => {
        this.nodeUpdate(e.selectChildren('g'), transform)
      })
      this.allLinkG.call((e) => {
        this.linkUpdate(e.selectChildren('g'), transform)
      })
      this.drawEarth()
      this.observer.dispatch('scale', transform)
    })
  }
  cacheData?: dataInputT
  update(data: dataInputT) {
    this.cacheData = data
    console.log(data)
    verifyDataInput(data)
    const nodeData = data.filter((el) => el.elementType == 'NODE') as nodeDataInputT[]
    const linkData = data.filter((el) => el.elementType == 'LINK') as linkDataInputT[]
    this.setScale(data)
    this.allLinkG
      .selectChildren<SVGGElement, linkDataInputT>('g.link-g')
      .data(linkData, (d) => d.id)
      .join(
        (e) => this.linkEnter(e),
        (e) => this.linkUpdate(e)
      )
    this.allNodeG
      .selectChildren<SVGGElement, nodeDataInputT>('g.node-g')
      .data(nodeData, (d) => d.id)
      .join(
        (e) => this.nodeEnter(e),
        (e) => this.nodeUpdate(e)
      )
    this.drawEarth()
  }
  private scaleObsSymbol = Symbol()
  private setScale(data: dataInputT) {
    const minX = data[0].distance,
      maxX = data.at(-1)!.distance
    this.xScale
      .domain([minX, maxX])
      .range([
        this.config.padding.left + this.config.barWidth,
        this.container.clientWidth - this.config.padding.right - this.config.barWidth * 0.5
      ])
      .nice()
    const { max: maxY, min: minY } = getMaxminY(data)
    this.yScale
      .domain([maxY, minY])
      .range([
        this.config.padding.top + 16,
        this.container.clientHeight - this.config.padding.bottom - 12
      ])
    this.xAxisG.call(axisBottom(this.xScale))
    const xListen = (transform: ZoomTransform) => {
      this.xAxisG.call(axisBottom(transform.rescaleX(this.xScale)))
    }
    this.observer.offBySymbol(this.scaleObsSymbol)
    this.observer.on('scale', xListen, this.scaleObsSymbol)
    this.yAxisG.call(axisLeft(this.yScale))
  }
  private nodeEnter(enter: Selection<EnterElement, nodeDataInputT, SVGGElement, undefined>) {
    const g = enter.append('g').attr('class', 'node-g')
    g.append('path')
      .attr('class', 'item fixed1')
      .attr('fill', this.config.fillBgColor)
      .call((g) => this.drawNodeFixed1(g))
    g.append('path')
      .attr('class', 'item fixed2')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke', this.config.strokeColor)
      .call((g) => this.drawNodeFixed2(g))
    g.append('path')
      .attr('class', 'item fixed3')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke', this.config.otherLinkStroke)
      .call((g) => this.drawNodeFixed3(g))
    g.append('text')
      .attr('class', 'item textInfo')
      .attr('fill', this.config.textColor)
      .style('font-size', 12)
      .style('text-anchor', 'middle')
      .call((g) => this.drawNodeText(g))
    return g
  }
  protected nodeUpdate(
    update: Selection<SVGGElement, nodeDataInputT, SVGGElement, undefined>,
    transform?: ZoomTransform
  ) {
    this.drawNodeFixed1(update.select('.fixed1'), transform)
    this.drawNodeFixed2(update.select('.fixed2'), transform)
    this.drawNodeFixed3(update.select('.fixed3'), transform)
    this.drawNodeText(update.select('.textInfo'), transform)
    return update
  }
  private drawNodeFixed1(
    g: Selection<SVGPathElement, nodeDataInputT, any, any>,
    transform?: ZoomTransform
  ) {
    const transf = transform ?? this.transform
    const xScale = transf ? transf.rescaleX(this.xScale) : this.xScale
    const barWidth = this.config.barWidth
    g.attr('d', (d) => {
      const [x, y] = [xScale(d.distance), this.yScale(d.wellBottomAlti)]
      const wallY = this.heightToY(d.wellDepth)
      return `M${x - 0.5 * barWidth} ${y}h${barWidth}v${-wallY}h${-barWidth}z`
    })
  }
  private drawNodeFixed2(
    g: Selection<SVGPathElement, nodeDataInputT, any, any>,
    transform?: ZoomTransform
  ) {
    const transf = transform ?? this.transform
    const xScale = transf ? transf.rescaleX(this.xScale) : this.xScale
    g.attr('d', (d) => {
      const [x, y] = [xScale(d.distance), this.yScale(d.wellBottomAlti)]
      return `M${x} ${y}V${this.container.clientHeight}`
    })
  }
  private drawNodeFixed3(
    g: Selection<SVGPathElement, nodeDataInputT, any, any>,
    transform?: ZoomTransform
  ) {
    const transf = transform ?? this.transform
    const xScale = transf ? transf.rescaleX(this.xScale) : this.xScale
    g.attr('d', (d) => {
      let pathString = ''
      const x = xScale(d.distance)
      d.otherLinkInfo.forEach((linkinfo) => {
        const y = this.yScale(d.wellBottomAlti + Number(linkinfo.offset))
        const ry = 0.5 * this.heightToY(linkinfo.sectionWidth ? linkinfo.sectionWidth : 1)
        const rx = 0.5 * this.config.barWidth
        pathString += `M${x - rx} ${y - ry}a${rx},${ry} 0,0,1 ${rx * 2},0a${rx},${ry} 0,0,1 ${
          -rx * 2
        },0`
      })
      return pathString
    })
  }
  private drawNodeText(
    g: Selection<SVGTextElement, nodeDataInputT, any, any>,
    transform?: ZoomTransform
  ) {
    const transf = transform ?? this.transform
    const xScale = transf ? transf.rescaleX(this.xScale) : this.xScale
    g.attr('x', (d) => xScale(d.distance))
      .attr('y', (d) => this.yScale(d.wellDepth + d.wellBottomAlti) - 2)
      .text((d) => d.wellDepth)
  }
  /**高度转换y轴上的像素值 */
  protected heightToY(height: number) {
    const yScale = this.yScale
    return Math.abs(yScale(0) - yScale(height))
  }
  /**长度转换x轴上的像素值 */
  protected distanceToX(height: number) {
    const xScale = this.xScale
    return Math.abs(xScale(0) - xScale(height))
  }
  private linkEnter(enter: Selection<EnterElement, linkDataInputT, SVGGElement, undefined>) {
    const g = enter.append('g').attr('class', 'link-g')
    g.append('path')
      .attr('class', 'item fixed')
      .attr('fill', this.config.fillBgColor)
      .call((g) => this.drawLinkFixed(g))
    g.append('text')
      .attr('class', 'item textInfo textInfo-link')
      .attr('fill', this.config.textColor)
      .style('font-size', 12)
      .style('text-anchor', 'middle')
      .call((g) => this.drawLinkText(g))
    return g
  }
  private linkUpdate(
    update: Selection<SVGGElement, linkDataInputT, SVGGElement, undefined>,
    transform?: ZoomTransform
  ) {
    this.drawLinkFixed(update.select('.fixed'), transform)
    this.drawLinkText(update.select('.textInfo'), transform)
    return update
  }
  private drawLinkFixed(
    g: Selection<SVGPathElement, linkDataInputT, any, any>,
    transform?: ZoomTransform
  ) {
    const transf = transform ?? this.transform
    const xScale = transf ? transf.rescaleX(this.xScale) : this.xScale
    const barWidth = this.config.barWidth
    g.attr('d', (d) => {
      const startX = xScale(d.distance),
        endX = xScale(d.distance + d.pipeLength),
        sectionWidth = this.heightToY(d.sectionWidth ?? this.config.defaultSectionWidth),
        begY = this.yScale(d.begNodeBottom + Number(d.begOffset ?? 0)),
        endY = this.yScale(d.endNodeBottom + Number(d.endOffset ?? 0))
      return `M${startX + barWidth * 0.5 - 1} ${begY - sectionWidth}v${sectionWidth}L${
        endX - barWidth * 0.5 + 1
      } ${endY} v${-sectionWidth}Z`
    })
  }

  private drawLinkText(
    gInput: Selection<SVGTextElement, linkDataInputT, any, any>,
    transformInput?: ZoomTransform
  ) {
    const transform = transformInput ?? this.transform
    const xScale = transform ? transform.rescaleX(this.xScale) : this.xScale
    const g = transformInput ? gInput : gInput.transition().duration(500)
    g.attr('x', (d) => {
      const startX = xScale(d.distance),
        endX = xScale(d.distance + d.pipeLength)
      return (startX + endX) / 2
    })
    g.attr('y', (d) => {
      const sectionWidth = this.heightToY(d.sectionWidth ?? this.config.defaultSectionWidth),
        begY = this.yScale(d.begNodeBottom + Number(d.begOffset ?? 0)),
        endY = this.yScale(d.endNodeBottom + Number(d.endOffset ?? 0))
      return (begY + endY) / 2 - sectionWidth - 4
    })
    g.text((d) => {
      if (d.sectionWidth == null) return '无数据'
      return d.sectionWidth
    })
  }
  private drawEarth(transformIn?: ZoomTransform) {
    if (!this.cacheData) throw new Error('未读取到缓存数据')
    const transform = transformIn ?? this.transform
    const xScale = transform ? transform.rescaleX(this.xScale) : this.xScale
    const yScale = this.yScale
    const nodeData = this.cacheData.filter((el) => el.elementType == 'NODE') as nodeDataInputT[]
    if (nodeData.length == 0) return
    const startNode = nodeData[0],
      endNode = nodeData[nodeData.length - 1],
      barWidth = this.config.barWidth,
      containerHight = this.container.clientHeight
    let dString = `M${xScale(startNode.distance) - 0.5 * barWidth} ${containerHight}`
    nodeData.forEach((node) => {
      const x = xScale(node.distance),
        y = yScale(node.wellBottomAlti + node.wellDepth)
      dString += `L${x - 0.5 * barWidth} ${y}L${x + 0.5 * barWidth} ${y}`
    })
    dString += `L${xScale(endNode.distance) + 0.5 * barWidth} ${containerHight}Z`
    this.earthPath.attr('d', dString)
  }
}
