// 請丹妮協作呼叫api
// Model
// const locationList = ['基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣', '臺東縣', '花蓮縣', '宜蘭縣' ,'澎湖縣' ,'金門縣', '連江縣']; // 若需要設定排序則使用此資料

let locationList = [];

const bgColor = {
  above30: "#DB2F2F",
  above25: "#CF6F0F",
  above20: "#BCD862",
  above15: "#38D8C0",
  above10: "#33AEC9",
  rest: "#4C34BA",
  findColorCode(temp) {
    if (temp >= 30) return this.above30;
    else if (temp >= 25) return this.above25;
    else if (temp >= 20) return this.above20;
    else if (temp >= 15) return this.above15;
    else if (temp >= 10) return this.above10;
    else return this.rest;
  },
};

const weatherIcon = {
  sunny: "./static/images/little-whitesun.png",
  bigSunny: "./static/images/big-sunny.png",
  partlyCloudy: "./static/images/little-partly-cloudy.png",
  bigPartlyCloudy: "./static/images/big-partly-cloudy.png",
  cloudy: "./static/images/little-cloud.png",
  bigCloudy: "./static/images/big-cloudy.png",
  thunderstorm: "./static/images/cloud-thunder.png",
  bigThunderstorm: "./static/images/big-thunderstorm.png",
  rainy: "./static/images/rainfall.png",
  bigRainy: "./static/images/big-rainy.png",
  findWeatherIcon(codeStr) {
    const code = Number(codeStr);
    if ((1 <= code && code <= 3) || (24 <= code && code <= 26))
      return this.sunny;
    else if ((4 <= code && code <= 5) || code === 27) return this.partlyCloudy;
    else if ((6 <= code && code <= 7) || code === 28) return this.cloudy;
    else if (
      (15 <= code && code <= 18) ||
      (21 <= code && code <= 22) ||
      (33 <= code && code <= 36) ||
      code === 41
    )
      return this.thunderstorm;
    else return this.rainy;
  },
  findBigWeatherIcon(codeStr) {
    const code = Number(codeStr);
    if ((1 <= code && code <= 3) || (24 <= code && code <= 26))
      return this.bigSunny;
    else if ((4 <= code && code <= 5) || code === 27)
      return this.bigPartlyCloudy;
    else if ((6 <= code && code <= 7) || code === 28) return this.bigCloudy;
    else if (
      (15 <= code && code <= 18) ||
      (21 <= code && code <= 22) ||
      (33 <= code && code <= 36) ||
      code === 41
    )
      return this.bigThunderstorm;
    else return this.bigRainy;
  },
};

const state = {
  allLocData: [],
  departure: {
    location: "",
    choosedDate: "",
    choosedTime: "",
    weatherData: [],
  },
  destination: {
    location: "",
    choosedDate: "",
    choosedTime: "",
    weatherData: [],
  },
};

// timeFrom參數必須是現在時刻的上一個計時點(00, 03, 06, 09, 12, 15, 18, 21)
// 如: 14:30->12:00, 15:01->15:00
// 但是!
// 每日 05:00 發佈的預報從 當日 06:00~18:00 開始
// 每日 11:00 發佈的預報從 當日 12:00~18:00 開始
// 每日 17:00 發佈的預報從 當日 18:00~06:00 開始
// 每日 23:00 發佈的預報從 隔日 00:00~06:00 開始
// 所以如果在11:01開啟程式，就已經沒有11:00的天氣可以看了。

const now = new Date();
const adjustedTime = new Date(now);
adjustedTime.setHours(Math.floor(now.getHours() / 3) * 3, 0, 0, 0);

const CWA_API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-093?Authorization=CWA-90BC9459-D42C-41C8-A3D0-287E64137A4A&locationId=F-D0047-089,F-D0047-091&timeFrom=${getDateStr(
  adjustedTime
)}`;

const getWeatherData = async function () {
  try {
    const respose = await fetch(
      CWA_API_URL + "&ElementName=3小時降雨機率,溫度,天氣現象,最高溫度,最低溫度"
    );
    const { records } = await respose.json();
    let data = [];
    for (let i = 0; i < records.Locations[0].Location.length; i++) {
      const weatherData = [
        ...records.Locations[0].Location[i].WeatherElement,
        findWEObj(records.Locations[1].Location[i].WeatherElement, "最高溫度"),
        findWEObj(records.Locations[1].Location[i].WeatherElement, "最低溫度"),
      ];
      const obj = {
        location: records.Locations[1].Location[i].LocationName,
        weatherData: weatherData,
      };
      data.push(obj);
    }
    // console.log(data);
    data.forEach((locData) => {
      const normalizeLocData = normalizeWeatherData(locData.weatherData);
      locData.weatherData = normalizeLocData;
      const startFrom = locData.weatherData.find(
        (e) => e.time.substring(0, 2) == String(now.getHours()).padStart(2, "0")
      );
      locData.weatherData = locData.weatherData.slice(
        locData.weatherData.indexOf(startFrom)
      );
    });
    return data;
  } catch (err) {
    throw err;
  }
};

// View
// 行政區選取區塊
const departureLocView = {
  data: null,
  parentElement: document.querySelector(".departure-location"),
  dropdownElemet: document.querySelector(".departure>.city-dropdown"),
  render() {
    const data = this.data;
  },
  toggleDropdownList() {
    this.dropdownElemet.classList.toggle("hidden");
  },
  changeLocName(newName) {
    this.parentElement.querySelector(".departure-district").textContent =
      newName;
  },
  addHandlerExpandArrow(handler) {
    this.parentElement.addEventListener("click", (e) => {
      if (e.target.closest("div").classList.contains("arrow-indicator"))
        handler();
    });
  },
  addHandlerClickCityLi(handler) {
    this.dropdownElemet.addEventListener("click", (e) => {
      handler(e.target.closest("li").textContent);
    });
  },
};

const destinationLocView = {
  data: null,
  parentElement: document.querySelector(".destination"),
  dropdownElemet: document.querySelector(".destination>.city-dropdown"),
  render() {
    const data = this.data;
  },
  toggleDropdownList() {
    this.dropdownElemet.classList.toggle("hidden");
  },
  changeLocName(newName) {
    this.parentElement.querySelector(".destination-district").textContent =
      newName;
  },
  addHandlerExpandArrow(handler) {
    this.parentElement.addEventListener("click", (e) => {
      if (e.target.closest("div").classList.contains("arrow-indicator"))
        handler();
    });
  },
  addHandlerClickCityLi(handler) {
    this.dropdownElemet.addEventListener("click", (e) => {
      handler(e.target.closest("li").textContent);
    });
  },
};

// 日期選取區塊
const departureDateView = {
  data: null,
  parentElement: document.querySelector(".departure-forecast-days"),
  render() {
    const data = this.data;
    this.parentElement.innerHTML = "";
    const days = [...new Set(data.weatherData.map((e) => e.date))];
    for (let day of days) {
      const dayEl = document.createElement("div");
      if (day === data.choosedDate) dayEl.classList.add("active");
      dayEl.textContent = day.slice(-2);
      this.parentElement.appendChild(dayEl);
    }
  },
  changeDate() {
    for (let el of this.parentElement.children) {
      el.classList.remove("active");
      if (el.textContent === this.data.choosedDate.slice(-2))
        el.classList.add("active");
    }
  },
  addHandlerClickDate(handler) {
    this.parentElement.addEventListener("click", (e) => {
      if (e.target.querySelector("div") === null) handler(e.target.textContent);
    });
  },
};

const destinationDateView = {
  data: null,
  parentElement: document.querySelector(".destination-forecast-days"),
  render() {
    const data = this.data;
    this.parentElement.innerHTML = "";
    const days = [...new Set(data.weatherData.map((e) => e.date))];
    for (let day of days) {
      const dayEl = document.createElement("div");
      if (day === data.choosedDate) dayEl.classList.add("active");
      dayEl.textContent = day.slice(-2);
      this.parentElement.appendChild(dayEl);
    }
  },
  changeDate() {
    for (let el of this.parentElement.children) {
      el.classList.remove("active");
      if (el.textContent === this.data.choosedDate.slice(-2))
        el.classList.add("active");
    }
  },
  addHandlerClickDate(handler) {
    this.parentElement.addEventListener("click", (e) => {
      if (e.target.querySelector("div") === null) handler(e.target.textContent);
    });
  },
};

// 詳細內容
const departureDetailView = {
  data: null,
  parentElement: document.querySelector(".departure"),
  render() {
    const data = this.data;
    const choosedWeatherData = data.weatherData.find((e) => {
      return e.date === data.choosedDate && e.time === data.choosedTime;
    });
    // 時刻
    this.parentElement.querySelector(
      ".current-time-text"
    ).textContent = `${data.choosedTime.substring(0, 2)}時`;
    // 溫度
    this.parentElement.querySelector(
      ".departure-temperature-value"
    ).textContent = choosedWeatherData.temperature;
    // 溫差
    document.querySelector(".temp-change-brackets").textContent =
      document.querySelector(".destination-temperature-value").textContent -
        choosedWeatherData.temperature >=
      0
        ? `+${
            document.querySelector(".destination-temperature-value")
              .textContent - choosedWeatherData.temperature
          }`
        : document.querySelector(".destination-temperature-value").textContent -
          choosedWeatherData.temperature;
    // 最高/最低溫
    this.parentElement.querySelector(
      ".departure-temperature-maxvalue"
    ).textContent = choosedWeatherData.maxTemp;
    this.parentElement.querySelector(
      ".departure-temperature-minvalue"
    ).textContent = choosedWeatherData.minTemp;
    // 降雨機率
    this.parentElement.querySelector(".departure-rainprob-value").textContent =
      choosedWeatherData.chanceOfRain;
    // 降雨機率差
    document.querySelector(".rainprob-change-value").textContent =
      document.querySelector(".departure-rainprob-value").textContent -
        choosedWeatherData.chanceOfRain >=
      0
        ? `+${
            document.querySelector(".departure-rainprob-value").textContent -
            choosedWeatherData.chanceOfRain
          }`
        : document.querySelector(".departure-rainprob-value").textContent -
          choosedWeatherData.chanceOfRain;
  },
};

const destinationDetailView = {
  data: null,
  parentElement: document.querySelector(".destination"),
  render() {
    const data = this.data;
    const choosedWeatherData = data.weatherData.find((e) => {
      return e.date === data.choosedDate && e.time === data.choosedTime;
    });
    // 時刻
    this.parentElement.querySelector(
      ".current-time-text"
    ).textContent = `${data.choosedTime.substring(0, 2)}時`;
    // 溫度
    this.parentElement.querySelector(
      ".destination-temperature-value"
    ).textContent = choosedWeatherData.temperature;
    // 溫差
    this.parentElement.querySelector(".temp-change-brackets").textContent =
      choosedWeatherData.temperature -
        document.querySelector(".departure-temperature-value").textContent >=
      0
        ? `+${
            choosedWeatherData.temperature -
            document.querySelector(".departure-temperature-value").textContent
          }`
        : choosedWeatherData.temperature -
          document.querySelector(".departure-temperature-value").textContent;
    // 最高/最低溫
    this.parentElement.querySelector(
      ".destination-temperature-maxvalue"
    ).textContent = choosedWeatherData.maxTemp;
    this.parentElement.querySelector(
      ".destination-temperature-minvalue"
    ).textContent = choosedWeatherData.minTemp;
    // 降雨機率
    this.parentElement.querySelector(
      ".destination-rainprob-value"
    ).textContent = choosedWeatherData.chanceOfRain;
    // 降雨機率差
    this.parentElement.querySelector(".rainprob-change-value").textContent =
      choosedWeatherData.chanceOfRain -
        document.querySelector(".departure-rainprob-value").textContent >=
      0
        ? `+${
            choosedWeatherData.chanceOfRain -
            document.querySelector(".departure-rainprob-value").textContent
          }`
        : choosedWeatherData.chanceOfRain -
          document.querySelector(".departure-rainprob-value").textContent;
  },
};

// 時間選取區塊
const departureTimeView = {
  data: null,
  parentElement: document.querySelector(".departure-weather-items"),
  arrowLeftEl: document.querySelector(
    ".departure-periodic-weather>.time-arrow-left"
  ),
  arrowRightEl: document.querySelector(
    ".departure-periodic-weather>.time-arrow-right"
  ),
  itemWidth:
    document.querySelector(".departure-weather-items>.departure-weather-item")
      .clientWidth + 6, // deal with 3px border with animation
  render() {
    const data = this.data;
    this.parentElement.innerHTML = "";
    const renderTimeData = data.weatherData; //.slice(0, 5); // testing
    renderTimeData.forEach((timeData) => {
      const timeItemEl = document.createElement("div");
      timeItemEl.classList.add("departure-weather-item");
      const timeEl = document.createElement("div");
      timeEl.classList.add("departure-weather-time");
      timeEl.textContent = timeData.time.substring(0, 2);
      const iconEl = document.createElement("div");
      const icon = document.createElement("img");
      icon.src = weatherIcon.findWeatherIcon(timeData.weatherCode);
      // console.log(timeData.weatherCode, icon.src);
      iconEl.appendChild(icon);
      timeItemEl.append(timeEl, iconEl);
      this.parentElement.appendChild(timeItemEl);
    });
    // add active class
    const choosedTimeWeatherIndex = renderTimeData.findIndex(
      (e) => e.time === data.choosedTime
    );
    this.parentElement.children[choosedTimeWeatherIndex].classList.add(
      "active"
    );
  },
  changeTime() {
    for (let el of this.parentElement.children) {
      el.classList.remove("active");
    }
    const i = this.data.weatherData.findIndex(
      (e) =>
        e.date === this.data.choosedDate && e.time === this.data.choosedTime
    );
    const choosedTimeItem = this.parentElement.children[i];
    choosedTimeItem.classList.add("active");
    // console.log(
    //   i,
    //   choosedTimeItem.clientWidth,
    //   choosedTimeItem.offsetWidth,
    //   (this.itemWidth + 5) * (i - 2),
    //   choosedTimeItem.offsetLeft - choosedTimeItem.offsetWidth * 2,
    //   choosedTimeItem.offsetLeft +
    //     choosedTimeItem.offsetWidth / 2 -
    //     this.parentElement.clientWidth / 2
    // );
    // item.offsetLeft + item.offsetWidth / 2 - parent.clientWidth / 2;
    this.parentElement.scrollTo({
      left:
        choosedTimeItem.offsetLeft -
        (choosedTimeItem.offsetWidth + 10) / 2 -
        (choosedTimeItem.offsetWidth + 5) * 2,
    });
  },
  scroll(direction) {
    const itemClientWidth = this.parentElement.children[0].clientWidth;
    if (direction === "left") {
      this.parentElement.scrollLeft -= (itemClientWidth + 5) * 3;
    } else {
      this.parentElement.scrollLeft += (itemClientWidth + 5) * 3;
    }
  },

  addHandlerClickTime(handler) {
    this.parentElement.addEventListener("click", (e) => {
      const clickedItem = e.target.closest(".departure-weather-item");
      if (clickedItem !== null) handler(clickedItem);
    });
  },
  addHnadlerClickLeftArrow(handler) {
    this.arrowLeftEl.addEventListener("click", () => {
      handler("left");
    });
  },
  addHnadlerClickRightArrow(handler) {
    this.arrowRightEl.addEventListener("click", () => {
      handler("right");
    });
  },
};

const destinationTimeView = {
  data: null,
  parentElement: document.querySelector(".destination-weather-items"),
  arrowLeftEl: document.querySelector(
    ".destination-periodic-weather>.time-arrow-left"
  ),
  arrowRightEl: document.querySelector(
    ".destination-periodic-weather>.time-arrow-right"
  ),
  itemWidth:
    document.querySelector(
      ".destination-weather-items>.destination-weather-item"
    ).clientWidth + 6, // deal with 3px border with animation
  render() {
    const data = this.data;
    this.parentElement.innerHTML = "";
    const renderTimeData = data.weatherData; //.slice(0, 5); // testing
    renderTimeData.forEach((timeData) => {
      const timeItemEl = document.createElement("div");
      timeItemEl.classList.add("destination-weather-item");
      const timeEl = document.createElement("div");
      timeEl.classList.add("destination-weather-time");
      timeEl.textContent = timeData.time.substring(0, 2);
      const iconEl = document.createElement("div");
      const icon = document.createElement("img");
      icon.src = weatherIcon.findWeatherIcon(timeData.weatherCode);
      iconEl.appendChild(icon);
      timeItemEl.append(timeEl, iconEl);
      this.parentElement.appendChild(timeItemEl);
    });
    // add active class
    const choosedTimeWeatherIndex = renderTimeData.findIndex(
      (e) => e.time === data.choosedTime
    );
    this.parentElement.children[choosedTimeWeatherIndex].classList.add(
      "active"
    );
  },
  changeTime() {
    for (let el of this.parentElement.children) {
      el.classList.remove("active");
    }
    const i = this.data.weatherData.findIndex(
      (e) =>
        e.date === this.data.choosedDate && e.time === this.data.choosedTime
    );
    const choosedTimeItem = this.parentElement.children[i];
    choosedTimeItem.classList.add("active");
    // console.log(
    //   i,
    //   choosedTimeItem.clientWidth,
    //   choosedTimeItem.offsetWidth,
    //   (this.itemWidth + 5) * (i - 2),
    //   choosedTimeItem.offsetLeft
    // );
    this.parentElement.scrollTo({
      left:
        choosedTimeItem.offsetLeft -
        (choosedTimeItem.offsetWidth + 10) / 2 -
        (choosedTimeItem.offsetWidth + 5) * 2,
    });
  },
  scroll(direction) {
    const itemClientWidth = this.parentElement.children[0].clientWidth;
    if (direction === "left") {
      this.parentElement.scrollLeft -= (itemClientWidth + 5) * 3;
    } else {
      this.parentElement.scrollLeft += (itemClientWidth + 5) * 3;
    }
  },

  addHandlerClickTime(handler) {
    this.parentElement.addEventListener("click", (e) => {
      const clickedItem = e.target.closest(".destination-weather-item");
      if (clickedItem !== null) handler(clickedItem);
    });
  },
  addHnadlerClickLeftArrow(handler) {
    this.arrowLeftEl.addEventListener("click", () => {
      handler("left");
    });
  },
  addHnadlerClickRightArrow(handler) {
    this.arrowRightEl.addEventListener("click", () => {
      handler("right");
    });
  },
};

// 背景
const backgroundView = {
  parentElement: document.querySelector("body"),
  changeBGColor(departureColor, destinationColor) {
    this.parentElement.style.background = `linear-gradient(to right,${departureColor} 0%,${departureColor} 15%,${destinationColor} 85%,${destinationColor} 100%)`;
  },
};

const bigIconView = {
  parentElement: document.querySelector(".bottom-weather-icons"),
  changeDepIcon(departureBigIcon) {
    this.parentElement.children[0].children[0].src = departureBigIcon;
  },
  changeDestIcon(destinationBigIcon) {
    this.parentElement.children[1].children[0].src = destinationBigIcon;
  },
};

// Controller
const controlUpdateData = async function () {
  try {
    const data = await getWeatherData();
    state.allLocData = data;
    // console.log(state.allLocData);
  } catch (err) {
    console.error(err);
  }
};

const controlDepLocDropdown = function () {
  departureLocView.toggleDropdownList();
};
const controlChangeDepLoc = function (clickedDist) {
  departureLocView.toggleDropdownList();
  departureLocView.changeLocName(clickedDist);
  state.departure.weatherData = state.allLocData.find(
    (e) => e.location === clickedDist
  ).weatherData;
  departureDetailView.data = state.departure;
  departureDetailView.render();
  departureTimeView.render();
  departureTimeView.data = state.departure;
  departureTimeView.render();
  departureTimeView.changeTime();
  changeBGColorUtil();
  changeDepBigIconUtil();
};
const controlChangeDepDate = function (clickedDate) {
  const clickedDateFirstData = state.departure.weatherData.find(
    (e) => e.date.slice(-2) === clickedDate
  );
  state.departure.choosedDate = clickedDateFirstData.date;
  state.departure.choosedTime = clickedDateFirstData.time;
  departureDetailView.data = state.departure;
  departureDateView.changeDate();
  departureDetailView.render();
  departureTimeView.changeTime();
  changeBGColorUtil();
  changeDepBigIconUtil();
};
const controlChangeDepTime = function (clickedTimeEl) {
  const clickTimeElInde = Array.from(
    document.querySelector(".departure-weather-items").children
  ).findIndex((e) => e === clickedTimeEl);
  const clickedTimeData = state.departure.weatherData[clickTimeElInde];
  // console.log(clickedTimeData);
  state.departure.choosedDate = clickedTimeData.date;
  state.departure.choosedTime = clickedTimeData.time;
  departureDetailView.data = state.departure;
  departureTimeView.changeTime();
  departureDateView.changeDate();
  departureDetailView.render();
  changeBGColorUtil();
  changeDepBigIconUtil();
};
const controlClickToScrollDepTimeList = function (direction) {
  departureTimeView.scroll(direction);
};

const controlDestLocDropdown = function () {
  destinationLocView.toggleDropdownList();
};
const controlChangeDestLoc = function (clickedDist) {
  destinationLocView.toggleDropdownList();
  destinationLocView.changeLocName(clickedDist);
  state.destination.weatherData = state.allLocData.find(
    (e) => e.location === clickedDist
  ).weatherData;
  destinationDetailView.data = state.destination;
  destinationDetailView.render();
  destinationTimeView.render();
  destinationTimeView.data = state.destination;
  destinationTimeView.render();
  destinationTimeView.changeTime();
  changeBGColorUtil();
  changeDestBigIconUtil();
};
const controlChangeDestDate = function (clickedDate) {
  const clickedDateFirstData = state.destination.weatherData.find(
    (e) => e.date.slice(-2) === clickedDate
  );
  state.destination.choosedDate = clickedDateFirstData.date;
  state.destination.choosedTime = clickedDateFirstData.time;
  destinationDetailView.data = state.destination;
  destinationDateView.changeDate();
  destinationDetailView.render();
  destinationTimeView.changeTime();
  changeBGColorUtil();
  changeDestBigIconUtil();
};
const controlChangeDestTime = function (clickedTimeEl) {
  const clickTimeElInde = Array.from(
    document.querySelector(".destination-weather-items").children
  ).findIndex((e) => e === clickedTimeEl);
  const clickedTimeData = state.destination.weatherData[clickTimeElInde];
  console.log(clickedTimeData);
  state.destination.choosedDate = clickedTimeData.date;
  state.destination.choosedTime = clickedTimeData.time;
  destinationDetailView.data = state.destination;
  destinationTimeView.changeTime();
  destinationDateView.changeDate();
  destinationDetailView.render();
  changeBGColorUtil();
  changeDestBigIconUtil();
};
const controlClickToScrollDestTimeList = function (direction) {
  destinationTimeView.scroll(direction);
};

const controlInitDeparture = async function (locationName) {
  const location = locationName || "臺北市"; // 預設顯示台北市的資料
  const renderData = state.allLocData.find((e) => e.location === location);
  state.departure.location = location;
  state.departure.weatherData = renderData.weatherData;
  state.departure.choosedDate = state.departure.weatherData[0].date;
  state.departure.choosedTime = state.departure.weatherData[0].time;
  departureDetailView.data = state.departure;
  departureDetailView.render();
  departureDateView.data = state.departure;
  departureDateView.render();
  departureTimeView.data = state.departure;
  departureTimeView.render();
  changeBGColorUtil();
  changeDepBigIconUtil();
};

const controlInitDestination = async function (locationName) {
  const location = locationName || "高雄市"; // 預設顯示高雄市的資料
  const renderData = state.allLocData.find((e) => e.location === location);
  state.destination.location = location;
  state.destination.weatherData = renderData.weatherData;
  state.destination.choosedDate = state.destination.weatherData[0].date;
  state.destination.choosedTime = state.destination.weatherData[0].time;
  destinationDetailView.data = state.destination;
  destinationDetailView.render();
  destinationDateView.data = state.destination;
  destinationDateView.render();
  destinationTimeView.data = state.destination;
  destinationTimeView.render();
  changeBGColorUtil();
  changeDestBigIconUtil();
};

const init = async function () {
  await controlUpdateData();
  // 初始資料
  let favoriteController = new FavoriteController(
    new FavoriteModel(),
    new FavoriteView()
  );
  favoriteController.init();
  state.departure.location = favoriteController.model.departure;
  state.destination.location = favoriteController.model.destination;
  controlInitDeparture(state.departure.location);
  controlInitDestination(state.destination.location);
  // 選擇地點時自動更新Favorite紀錄
  departureLocView.addHandlerClickCityLi((clickedDist) => {
    if (favoriteController.model.favoriteToggle) {
      favoriteController.model.setDepartureFavorite(clickedDist);
    }
  });
  destinationLocView.addHandlerClickCityLi((clickedDist) => {
    if (favoriteController.model.favoriteToggle) {
      favoriteController.model.setDestinationFavorite(clickedDist);
    }
  });
  // 選取地點
  departureLocView.addHandlerExpandArrow(controlDepLocDropdown);
  departureLocView.addHandlerClickCityLi(controlChangeDepLoc);
  destinationLocView.addHandlerExpandArrow(controlDestLocDropdown);
  destinationLocView.addHandlerClickCityLi(controlChangeDestLoc);
  // 選取日期
  departureDateView.addHandlerClickDate(controlChangeDepDate);
  destinationDateView.addHandlerClickDate(controlChangeDestDate);
  // 選取時間
  departureTimeView.addHandlerClickTime(controlChangeDepTime);
  destinationTimeView.addHandlerClickTime(controlChangeDestTime);
  // 移動時間軸
  departureTimeView.addHnadlerClickLeftArrow(controlClickToScrollDepTimeList);
  departureTimeView.addHnadlerClickRightArrow(controlClickToScrollDepTimeList);
  destinationTimeView.addHnadlerClickLeftArrow(
    controlClickToScrollDestTimeList
  );
  destinationTimeView.addHnadlerClickRightArrow(
    controlClickToScrollDestTimeList
  );
};

init();

// Util
function getDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(
    2,
    "0"
  )}T${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function findWEObj(arr, elName) {
  const [targetObj] = arr.filter((obj) => obj.ElementName === elName);
  return targetObj;
}

function normalizeWeatherData(rawData) {
  const temperatureEntry = rawData.find((e) => e.ElementName === "溫度");
  const rainEntry = rawData.find((e) => e.ElementName === "3小時降雨機率");
  const weatherEntry = rawData.find((e) => e.ElementName === "天氣現象");
  const maxTempEntry = rawData.find((e) => e.ElementName === "最高溫度");
  const minTempEntry = rawData.find((e) => e.ElementName === "最低溫度");

  const output = temperatureEntry.Time.map((tempItem) => {
    const time = new Date(tempItem.DataTime);
    const [dateStr, timeWithZone] = tempItem.DataTime.split("T");
    const timeStr = timeWithZone.split("+")[0];

    // 幫助函式：判斷某個時間是否在區段內
    const isInRange = (target, start, end) => {
      const t = new Date(target);
      return new Date(start) <= t && t < new Date(end);
    };

    // 找到符合這個時間的降雨資料
    const rainItem = rainEntry.Time.find((t) =>
      isInRange(time, t.StartTime, t.EndTime)
    );
    const weatherItem = weatherEntry.Time.find((t) =>
      isInRange(time, t.StartTime, t.EndTime)
    );
    const maxTempItem = maxTempEntry.Time.find((t) =>
      isInRange(time, t.StartTime, t.EndTime)
    );
    const minTempItem = minTempEntry.Time.find((t) =>
      isInRange(time, t.StartTime, t.EndTime)
    );

    return {
      date: dateStr,
      time: timeStr,
      temperature: tempItem.ElementValue[0].Temperature || null,
      chanceOfRain:
        rainItem?.ElementValue[0].ProbabilityOfPrecipitation || null,
      weather: weatherItem?.ElementValue[0].Weather || null,
      weatherCode: weatherItem?.ElementValue[0].WeatherCode || null,
      maxTemp: maxTempItem?.ElementValue[0].MaxTemperature || null,
      minTemp: minTempItem?.ElementValue[0].MinTemperature || null,
    };
  });

  return output;
}

function changeBGColorUtil() {
  const depColor = bgColor.findColorCode(
    document.querySelector(".departure-temperature-value").textContent
  );
  const destColor = bgColor.findColorCode(
    document.querySelector(".destination-temperature-value").textContent
  );
  backgroundView.changeBGColor(depColor, destColor);
}

function changeDepBigIconUtil() {
  const departureBigIcon = weatherIcon.findBigWeatherIcon(
    state.departure.weatherData.find(
      (e) =>
        e.date === state.departure.choosedDate &&
        e.time === state.departure.choosedTime
    ).weatherCode
  );

  bigIconView.changeDepIcon(departureBigIcon);
}

function changeDestBigIconUtil() {
  const destinationBigIcon = weatherIcon.findBigWeatherIcon(
    state.destination.weatherData.find(
      (e) =>
        e.date === state.destination.choosedDate &&
        e.time === state.destination.choosedTime
    ).weatherCode
  );
  bigIconView.changeDestIcon(destinationBigIcon);
}
