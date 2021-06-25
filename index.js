const fetch = require('node-fetch');
const fs = require('fs');
const { format, fromUnixTime } = require('date-fns');


(() => {
  fetch('https://ustvgo.tv/tvguide/national.json').then(r => r.json()).then(r => {
    fs.writeFileSync('./input/data.json', JSON.stringify(r));

    var grouping = r.reduce((acc, c) => {
      var station = c.channel.name.replace('&', '&amp;');


      var programs = c.programSchedules.map(prg => {
        return {
          startTime: prg.startTime,
          endTime: prg.endTime,
          title: prg.title
        }
      }, [])
      
      !acc[station] ? acc[station] = programs : null;
      return acc;
    }, {})
    return grouping;
  }).then(data => {
    let channelXML = Object.keys(data).map((r, i) => {
      return `<channel id="${r}.00${i}">
      \t<display-name lang="en">${r}</display-name>
      <icon src="${r}.jpg" />
      </channel>`
    }, []).join('\r\n')


    let programsXML = Object.entries(data).map((r, i) => {
      return r[1].map(prg => {
        var startDate = format(fromUnixTime(prg.startTime), 'yyyyMMddHHMMSS');
        var endDate = format(fromUnixTime(prg.endTime), 'yyyyMMddHHMMSS');
        var title = prg.title;

        return `<programme start="${startDate} -0600" stop="${endDate} -0600" channel="${r[0]}.00${i}">
        <title>${title}</title>
        </programme>`
      }, []).join('\r\n')
    }, []).join('\r\n')

    fs.writeFileSync('./output/epg.xml', `<?xml version="1.0" encoding="UTF-8"?>\n`)

    fs.appendFileSync('./output/epg.xml', [
      `<tv>`,
      channelXML.replace(/amp;|&|!|/gm, ''),
      programsXML.replace(/amp;|&|!/gm, ''),
      `</tv>`
    ].join('\r\n'));
  })
})()