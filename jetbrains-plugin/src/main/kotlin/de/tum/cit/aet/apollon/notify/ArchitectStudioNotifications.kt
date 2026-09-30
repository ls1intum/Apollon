package de.tum.cit.aet.apollon.notify

import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.project.Project

/** The one balloon group PlantUML import/export/sync reports through. */
private const val GROUP_ID = "Architect Studio"

/** Thin wrapper over [NotificationGroupManager] so every balloon in this feature looks the same. */
object ArchitectStudioNotifications {
    fun info(
        project: Project,
        title: String,
        content: String,
        vararg actions: NotificationAction,
    ) = notify(project, title, content, NotificationType.INFORMATION, *actions)

    fun warn(
        project: Project,
        title: String,
        content: String,
        vararg actions: NotificationAction,
    ) = notify(project, title, content, NotificationType.WARNING, *actions)

    fun error(
        project: Project,
        title: String,
        content: String,
        vararg actions: NotificationAction,
    ) = notify(project, title, content, NotificationType.ERROR, *actions)

    private fun notify(
        project: Project,
        title: String,
        content: String,
        type: NotificationType,
        vararg actions: NotificationAction,
    ) {
        val notification =
            NotificationGroupManager.getInstance()
                .getNotificationGroup(GROUP_ID)
                .createNotification(title, content, type)
        actions.forEach { notification.addAction(it) }
        notification.notify(project)
    }
}
