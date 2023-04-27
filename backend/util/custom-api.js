const axios = require('axios')

const submitRecording = async () => {
    return await axios({
        url: `${process.env.SERVER_URL}/recording`,
        method: 'GET'
    })
}

module.exports = {
    submitRecording
}