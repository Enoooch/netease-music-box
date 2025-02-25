require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const { user_record } = require('NeteaseCloudMusicApi');

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  USER_ID: userId,
  USER_TOKEN: userToken,
} = process.env;

(async () => {
  /**
   * First, get user record
   */

  const record = await user_record({
    cookie: `MUSIC_U=${userToken}`,
    uid: userId,
    type: 1, // last week
  }).catch(error => console.error(`Unable to get user record \n${error}`));

  /**
   * Second, get week play data and parse into song/plays diagram
   */

  let totalPlayCount = 0;
  const { weekData } = record.body;
  weekData.forEach(data => {
    totalPlayCount += data.playCount;
  });

  const lines = weekData.slice(0, 5).reduce((prev, cur, index) => {
    const playCount = cur.playCount;
    const artists = cur.song.ar.map(a => a.name);
    const name = `${cur.song.name} - ${artists.join('/')}`;
    /**
     * @description: monospace not working in multiple languages
     */
    // const hexLength = name.split('').map(char => char.charCodeAt(0).toString(16)).join('').length;
    // const line = [
    //   name + ' '.padEnd(36 - hexLength / 2),
    //   `${playCount}`.padStart(4),
    //   'plays',
    // ];
    const line = [
      `${playCount}`.padStart(3),
      'plays',
      ' · ',
      name,
    ];

    return [...prev, line.join(' ')];
  }, []);

  /**
   * Finally, write into gist
   */

  try {
    const octokit = new Octokit({
      auth: `token ${githubToken}`,
    });
    const gist = await octokit.gists.get({
      gist_id: gistId,
    });

    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `🎵 My last week in music`,
          content: lines.join('\n'),
        },
      },
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
})();
