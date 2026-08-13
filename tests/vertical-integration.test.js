const assert = require("node:assert/strict");
const {
  VERTICAL_BOARD,
  VERTICAL_COMPANIES,
  getVerticalRent,
  getVerticalFinancials,
  ownsVerticalCompany
} = require("../server").__test;

function createGame() {
  return {
    players: [
      { id: "socket-a", clientId: "a", name: "Ana" },
      { id: "socket-b", clientId: "b", name: "Beto" }
    ],
    vertical: {
      players: [
        { clientId: "a", name: "Ana", cash: 1000 },
        { clientId: "b", name: "Beto", cash: 1500 }
      ],
      ownership: {}
    }
  };
}

function testBoardDistribution() {
  assert.equal(VERTICAL_BOARD.length, 40);
  assert.equal(VERTICAL_COMPANIES.length, 8);

  const groupSizes = VERTICAL_COMPANIES.map((company) => {
    return VERTICAL_BOARD.filter((square) => {
      return square.type === "property" && square.companyId === company.id;
    }).length;
  });
  assert.deepEqual(groupSizes, [2, 3, 3, 3, 3, 3, 3, 2]);
  assert.equal(VERTICAL_BOARD.filter((square) => square.type === "property").length, 22);
  assert.equal(VERTICAL_BOARD.filter((square) => square.type === "transport").length, 4);
  assert.equal(VERTICAL_BOARD.filter((square) => square.transportKind === "Puerto").length, 2);
  assert.equal(VERTICAL_BOARD.filter((square) => square.transportKind === "Aeropuerto").length, 2);
  assert.equal(VERTICAL_BOARD.filter((square) => square.type === "utility").length, 2);
  assert.equal(VERTICAL_BOARD.filter((square) => square.type === "goToJail").length, 1);
  assert.equal(VERTICAL_BOARD.filter((square) => square.type === "jail").length, 1);
  assert.equal(VERTICAL_BOARD.filter((square) => square.type === "rest").length, 1);

  VERTICAL_COMPANIES.forEach((company) => {
    const squares = VERTICAL_BOARD.filter((square) => square.companyId === company.id);
    const totalPrice = squares.reduce((total, square) => total + square.price, 0);
    squares.forEach((square) => assert.equal(square.groupCost, totalPrice));
  });
}

function testEconomiesAndDiseconomiesOfScale() {
  VERTICAL_BOARD.filter((square) => square.type === "property").forEach((square) => {
    assert.equal(square.costs.length, 5);
    assert.equal(square.rents.length, 5);
    const firstIncrease = square.rents[2] - square.rents[1];
    const secondIncrease = square.rents[3] - square.rents[2];
    const thirdIncrease = square.rents[4] - square.rents[3];
    assert.ok(secondIncrease > firstIncrease, `${square.name}: la segunda mejora debe escalar más`);
    assert.ok(secondIncrease > thirdIncrease, `${square.name}: la tercera mejora debe tener deseconomía`);
  });
}

function testCompanyAndRentRules() {
  const game = createGame();
  const company = VERTICAL_COMPANIES[0];
  const squares = VERTICAL_BOARD.filter((square) => square.companyId === company.id);

  game.vertical.ownership[squares[0].id] = {
    ownerClientId: "a",
    mortgaged: false,
    improvements: 0
  };
  assert.equal(ownsVerticalCompany(game, "a", company.id), false);
  assert.equal(getVerticalRent(game, squares[0], 7), squares[0].rents[0]);

  game.vertical.ownership[squares[1].id] = {
    ownerClientId: "a",
    mortgaged: false,
    improvements: 0
  };
  assert.equal(ownsVerticalCompany(game, "a", company.id), true);
  assert.equal(getVerticalRent(game, squares[0], 7), squares[0].rents[1]);

  game.vertical.ownership[squares[0].id].improvements = 2;
  assert.equal(getVerticalRent(game, squares[0], 7), squares[0].rents[3]);
  game.vertical.ownership[squares[0].id].mortgaged = true;
  assert.equal(getVerticalRent(game, squares[0], 7), 0);
}

function testFinancialPercentagesIncludeMortgage() {
  const game = createGame();
  const player = game.vertical.players[0];
  const square = VERTICAL_BOARD.find((item) => item.type === "property");
  game.vertical.ownership[square.id] = {
    ownerClientId: player.clientId,
    mortgaged: true,
    improvements: 1
  };

  const financials = getVerticalFinancials(game, player);
  assert.equal(financials.propertyValue, square.price + square.improvementCost);
  assert.equal(financials.mortgage, square.mortgageValue);
  assert.equal(financials.grossAssets, player.cash + financials.propertyValue);
  assert.equal(
    financials.netWorth,
    player.cash + financials.propertyValue - square.mortgageValue
  );
  assert.ok(financials.propertyPercentage > 0);
  assert.ok(financials.mortgagePercentage > 0);
}

testBoardDistribution();
testEconomiesAndDiseconomiesOfScale();
testCompanyAndRentRules();
testFinancialPercentagesIncludeMortgage();
console.log("Integración vertical: tablero, escala, rentas y balances OK");
