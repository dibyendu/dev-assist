const fs = require('fs'),
      d3 = require('d3'),
      D3Node = require('d3-node'),
      canvasModule = require('canvas')

var d3n = new D3Node({ canvasModule }),
    colors = ['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00']

async function getFileContent(context, pull_requests) {
  let promises = pull_requests.map(async pr => {
    let {data: files} = await context.github.pullRequests.getFiles(context.repo({ number: pr.number })),
        content = []

    // fetch all the files in parallel
    let promises = files.map(async file => {
      let {data: content} = await context.github.request({
        method: 'GET',
        url: file.raw_url
      })
      return {url: file.blob_url, name: file.filename, content}
    })

    // store them in sequence
    for (let promise of promises) {
      content.push(await promise)
    }

    return {pr_number: pr.number, files: content}
  })

  let content = []

  for (let promise of promises) {
    content.push(await promise)
  }

  return content
}

function createChart(chart_data) {
  let canvas = d3n.createCanvas(300, 300),
      context = canvas.getContext('2d'),
      width = canvas.width,
      height = canvas.height,
      radius = Math.min(width, height) / 2,
      arc = d3.arc().outerRadius(radius - 10).innerRadius(0).context(context),
      labelArc = d3.arc().outerRadius(radius - 40).innerRadius(radius - 40).context(context),
      pie = d3.pie().sort(null).value(d => d.changes)

  context.translate(width / 2, height / 2)
  let data = d3.csvParse(chart_data)
  let arcs = pie(data)

  arcs.forEach((d, i) => {
    context.beginPath()
    arc(d)
    context.fillStyle = colors[i]
    context.fill()
  })

  context.beginPath()
  arcs.forEach(arc)
  context.strokeStyle = '#fff'
  context.stroke()

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#000'

  arcs.forEach(d => {
    let c = labelArc.centroid(d)
    context.fillText(d.data.language, c[0], c[1])
  })

  return d3n.options.canvas.toDataURL().replace('data:image/png;base64,', '')
}

module.exports = { getFileContent, createChart }