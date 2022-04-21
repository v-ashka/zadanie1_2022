const getDate = () => {
    const date = new Date();
    //old style
    // const day = date.getDate();
    // const month = date.getMonth();
    // const year = date.getFullYear();

    // const timeH = date.getHours();
    // const timeM = date.getMinutes();
    // const timeS = date.getSeconds();
    // console.log(day, month, year, timeH, timeM, timeS, timeMS);
    
    const timeMS = date.getMilliseconds();
    const resultDate = date.toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    })

    const resultTime = date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
    //console.log(`${resultDate} ${resultTime}.${timeMS}`);
    return `${resultDate} ${resultTime}.${timeMS}`
}

module.exports = getDate;