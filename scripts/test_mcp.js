// scripts/test_mcp.js - Verify double-write holds and fallback structures
const dotenv = require('dotenv');
const mcpClient = require('../mcp_client');

dotenv.config();

console.log("🔍 Running Model Context Protocol (MCP) and Reservation Logic checks...");
console.log("----------------------------------------------------------------------");

async function runMcpChecks() {
  // 1. Initialize Client
  await mcpClient.initMcp();

  try {
    // 2. Validate availability query
    console.log("\n1. Testing availability check for August 10th at 7:30 PM...");
    const availability = await mcpClient.checkAvailability('2026-08-10', '19:30');
    console.log("Result:", JSON.stringify(availability));
    if (availability.available) {
      console.log("✅ Availability check passed (slot is free).");
    } else {
      console.log("ℹ️ Availability query successful, slot occupied, alternatives offered:", availability.alternative_slots);
    }

    // 3. Test slot busy handling
    console.log("\n2. Testing slot busy check (Friday night 7:30 PM mock busy slot)...");
    const busyCheck = await mcpClient.checkAvailability('2026-08-07', '19:30');
    console.log("Result:", JSON.stringify(busyCheck));
    if (!busyCheck.available && busyCheck.alternative_slots.length > 0) {
      console.log("✅ Busy validation passed: Correctly detected occupied slot and offered alternatives:", busyCheck.alternative_slots);
    } else {
      console.log("❌ Busy validation failed.");
    }

    // 4. Test Hold booking
    console.log("\n3. Testing table hold booking creation...");
    const booking = await mcpClient.bookReservation('2026-08-10', '19:30', 'Outdoor/Patio', 'TABLE-B99');
    console.log("Result:", JSON.stringify(booking));
    if (booking.confirmed && booking.code === 'TABLE-B99') {
      console.log("✅ Booking creation passed.");
    } else {
      console.log("❌ Booking creation failed.");
    }

    // 5. Test Cancellation
    console.log("\n4. Testing cancellation of TABLE-B99 hold...");
    const cancel = await mcpClient.cancelReservation('TABLE-B99');
    console.log("Result:", JSON.stringify(cancel));
    if (cancel.success) {
      console.log("✅ Cancellation passed.");
    } else {
      console.log("❌ Cancellation failed.");
    }

  } catch (error) {
    console.error("🔴 MCP or Mock logical validation failed with error:", error.message);
  }

  console.log("----------------------------------------------------------------------");
  console.log("MCP Client logical tests complete.");
}

runMcpChecks();
