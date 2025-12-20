package com.pairly.app.widget

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import android.util.Log

/**
 * Transparent floating activity to pick reaction emoji.
 * Opens when user taps reaction button on widget.
 */
class ReactionPickerActivity : Activity() {

    companion object {
        private const val TAG = "ReactionPicker"
        const val EXTRA_MOMENT_ID = "momentId"
        
        fun createIntent(context: Context, momentId: String): Intent {
            return Intent(context, ReactionPickerActivity::class.java).apply {
                putExtra(EXTRA_MOMENT_ID, momentId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
            }
        }
    }

    private val reactions = listOf("❤️", "😍", "😂", "😮", "👏")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Make activity transparent
        window.setBackgroundDrawableResource(android.R.color.transparent)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.attributes.dimAmount = 0.5f
        
        val momentId = intent.getStringExtra(EXTRA_MOMENT_ID)
        
        if (momentId == null) {
            Log.e(TAG, "❌ No momentId provided")
            finish()
            return
        }
        
        Log.d(TAG, "💝 Opening reaction picker for moment: $momentId")
        
        // Create UI programmatically
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(0xE0000000.toInt()) // Semi-transparent black
            setPadding(32, 24, 32, 24)
            elevation = 16f
        }
        
        reactions.forEach { emoji ->
            val emojiView = TextView(this).apply {
                text = emoji
                textSize = 32f
                setPadding(24, 16, 24, 16)
                setOnClickListener {
                    sendReaction(momentId, emoji)
                }
            }
            container.addView(emojiView)
        }
        
        // Center the container
        val wrapper = LinearLayout(this).apply {
            gravity = android.view.Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0x00000000) // Fully transparent
            setOnClickListener { finish() } // Tap outside to close
            addView(container)
        }
        
        setContentView(wrapper)
    }
    
    private fun sendReaction(momentId: String, emoji: String) {
        Log.d(TAG, "✅ Sending reaction: $emoji for moment: $momentId")
        
        // Start reaction service
        val intent = Intent(this, ReactionService::class.java).apply {
            putExtra(ReactionService.EXTRA_MOMENT_ID, momentId)
            putExtra(ReactionService.EXTRA_EMOJI, emoji)
        }
        startService(intent)
        
        // Close picker
        finish()
    }
    
    override fun onBackPressed() {
        super.onBackPressed()
        finish()
    }
}
