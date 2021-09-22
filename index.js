const fetch = require('node-fetch');
const fs = require('fs');
const { fromUnixTime } = require('date-fns');
const { format } = require('date-fns-tz');

let generateEPG = () => {
  return fetch('https://ustvgo.tv/tvguide/national.json').then(r => r.json()).then(r => {
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

    return {
      channels: channelXML,
      programs: programsXML
    }
  }).then(data => {
    fs.writeFileSync('./output/ustvgo_epg.xml', [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<tv>`,
      data.channels.replace(/amp;|&|!|/gm, ''),
      data.programs.replace(/amp;|&|!/gm, ''),
      `</tv>`
    ].join('\r\n'));
    return `EPG - programs generated: ${data.programs.length}`
  })
}

let generateM3u = () => {
  let channelList = fs.readFileSync('./ustvgo_channel_info.txt', 'utf8').split('\n');
  console.log(channelList.length)

  let jobs = channelList.map(channel => {
    let col = channel.split('|');
    let name = col[0].trim();
    let code = col[1].trim();
    let logo = col[2].trim();

    return fetch(`https://ustvgo.tv/data.php`, {
      method: "POST",
      headers: {
        "Content-Type": 'application/x-www-form-urlencoded'
      },
      body: `stream=${code}`
    }).then(res => res.text())
  })

  console.log(jobs.length)

  return Promise.all(jobs).then(job => {
    return job.map(r => {
      return `#EXTINFO:-1, ${r.split('/')[3]}\n${r}`
    })
  }).then(channels => {
    fs.writeFileSync('./output/ustvgo_channels.m3u', [
      '#EXTM3U',
      channels.join('\n\n')
    ].join('\n'))
    return `m3u - channels generated: ${channels.length}`
  })
}

(() => {
  Promise.all([
    generateEPG(),
    generateM3u()
  ])
  .then(r => {
    console.log(r)
  })
  
})()