const assert = require("node:assert/strict");
const argon2 = require("argon2");

async function run() {
    console.log("Running Auth & Password logic unit test...");

    // Test 1: Argon2 hashing and verification
    const defaultPassword = "admin123";
    const defaultHash = await argon2.hash(defaultPassword);
    assert(await argon2.verify(defaultHash, "admin123"), "Argon2 should verify admin123");
    assert(!await argon2.verify(defaultHash, "wrongpass"), "Argon2 should reject wrong password");
    console.log("  ✓ Argon2 hash and verification confirmed.");

    // Test 2: Legacy user migration logic
    const mockUsers = [
        { username: "legacy1", email: "l1@example.com", passwordHash: null },
        { username: "legacy2", email: "l2@example.com" }, // undefined passwordHash
        { username: "modern", email: "m@example.com", passwordHash: await argon2.hash("myPass456") }
    ];

    // Simulate migration
    for (const u of mockUsers) {
        if (!u.passwordHash) {
            u.passwordHash = defaultHash;
        }
    }
    assert.equal(mockUsers[0].passwordHash, defaultHash);
    assert.equal(mockUsers[1].passwordHash, defaultHash);
    assert(await argon2.verify(mockUsers[0].passwordHash, "admin123"));
    assert(await argon2.verify(mockUsers[1].passwordHash, "admin123"));
    assert(await argon2.verify(mockUsers[2].passwordHash, "myPass456"));
    console.log("  ✓ Legacy user migration sets admin123 hash.");

    // Test 3: Password Update logic
    let currentUser = { ...mockUsers[0] };
    const newPassword = "brandNewSuperPassword99";
    const newHash = await argon2.hash(newPassword);
    currentUser.passwordHash = newHash;

    assert(!await argon2.verify(currentUser.passwordHash, "admin123"), "Old admin123 must now fail");
    assert(await argon2.verify(currentUser.passwordHash, newPassword), "New password must succeed");
    console.log("  ✓ Password update invalidates old password and accepts new password.");

    console.log("\nAuth & Password unit logic tests PASSED! ✓");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

